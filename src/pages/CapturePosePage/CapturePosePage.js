import React, { Component } from "react";
import { Container, Row, Col, Button, Input, Label } from "reactstrap";
import "@tensorflow/tfjs";
import * as posenet from "@tensorflow-models/posenet";
import Layout from "../../components/Layout/Layout";
import {
  drawKeyPoints,
  drawSkeleton,
  processPose,
  drawBoundingBox
} from "../../utils/poseUtils";
import moment from "moment";

import beep from "../../assets/sounds/beep.wav";
import styles from "./CapturePosePage.module.css";

// The legacy positional API scaled 640x480 by 0.5, then rounded each dimension
// down to outputStride-aligned values: 305x225 for stride 16.
export const POSE_NET_MODEL_CONFIG = Object.freeze({
  architecture: "MobileNetV1",
  outputStride: 16,
  inputResolution: Object.freeze({ width: 305, height: 225 }),
  multiplier: 0.75,
  quantBytes: 4
});

export class NewRecordingPage extends Component {
  constructor(props) {
    super(props);
    this.videoRef = React.createRef();
    this.canvasRef = React.createRef();
    this.audioRef = React.createRef();
    this.state = {
      poseNet: {
        showDebug: true,
        flipHorizontal: false,
        imageScaleFactor: 0.5,
        outputStride: 16,
        minPoseConfidence: 0.1,
        minPartConfidence: 0.5,
        debugColor: "#f45342",
        debugBoxColor: "blue",
        debugWidth: 5
      },
      recordingState: "stopped",
      videoState: "recording",
      width: 640,
      height: 480,
      poses: [],
      captureDelay: 0,
      captureInterval: null,
      currentPose: null,
      currentImage: null
    };
  }

  async componentDidMount() {
    await this.loadVideo();
  }

  componentWillUnmount() {
    this.videoRef.current.pause();
    const tracks = this.currentStream.getTracks();
    tracks.forEach(track => track.stop());
    this.videoRef.current = null;
    this.canvasRef.current = null;
  }

  handleStopRecord = () => {
    this.canvasRef.current.style.display = "none";
    this.videoRef.current.style.display = "block";
    clearInterval(this.state.captureInterval);
  };

  setupCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Newer browser required to use ShadowCam");
    }
    this.videoRef.current.width = this.state.width;
    this.videoRef.current.height = this.state.height;
    this.currentStream = await navigator.mediaDevices.getUserMedia({
      mimeType: "video/webm; codecs=vp9",
      audio: false,
      video: {
        facingMode: "user",
        width: this.state.width,
        height: this.state.height
      }
    });

    this.videoRef.current.srcObject = this.currentStream;
    return new Promise(resolve => {
      this.videoRef.current.onloadedmetadata = () => {
        resolve(this.videoRef.current);
      };
    });
  };

  loadVideo = async () => {
    this.videoRef.current = await this.setupCamera();
    if (this.videoRef.current) {
      this.videoRef.current.play();
    }
  };

  processPose = async img => {
    const ctx = this.canvasRef.current.getContext("2d");
    this.canvasRef.current.width = this.state.width;
    this.canvasRef.current.height = this.state.height;
    if (!this.net) {
      this.net = await posenet.load(POSE_NET_MODEL_CONFIG);
    }

    ctx.clearRect(0, 0, this.state.width, this.state.height);
    ctx.save();
    ctx.drawImage(img, 0, 0);
    ctx.restore();

    const pose = await this.net.estimateSinglePose(this.canvasRef.current, {
      flipHorizontal: this.state.poseNet.flipHorizontal
    });

    const poseData = processPose(pose);

    if (this.state.poseNet.showDebug) {
      if (pose.score > this.state.poseNet.minPoseConfidence) {
        drawKeyPoints(
          pose.keypoints,
          this.state.poseNet.minPartConfidence,
          this.state.poseNet.debugColor,
          ctx
        );
        drawSkeleton(
          pose.keypoints,
          this.state.poseNet.minPartConfidence,
          this.state.poseNet.debugColor,
          this.state.poseNet.debugWidth,
          ctx
        );
        drawBoundingBox(pose.keypoints, ctx);
      }
    }
    return poseData;
  };

  setRecordingState = ({ id }) => {
    let newState;
    if (this.state.recordingState === "stopped" && id === "record") {
      newState = "recording";
      this.handleStopRecord();
      this.makeScreenshots();
    } else if (this.state.recordingState === "recording" && id === "stop") {
      newState = "stopped";
      this.handleStopRecord();
    }

    this.setState({
      recordingState: newState,
      videoState: "recording"
    });
  };

  toggleShowDebug = () => {
    this.setState(prevState => ({
      poseNet: { ...prevState.poseNet, showDebug: !prevState.poseNet.showDebug }
    }));
    if (this.state.currentPose) {
      const image = new Image();
      image.src = this.state.currentPose.src;
      this.processPose(image);
    }
  };

  handleClickedPose = async (timeStamp, img) => {
    const newPoses = this.state.poses.slice();
    const currentPoseIndex = newPoses.findIndex(
      pose => pose.timeStamp === timeStamp
    );
    newPoses.forEach(pose => (pose.selected = false));

    this.canvasRef.current.style.display = "block";
    this.videoRef.current.style.display = "none";

    newPoses[currentPoseIndex].poseData = await this.processPose(img);
    newPoses[currentPoseIndex].selected = true;

    this.setState({
      currentPose: newPoses[currentPoseIndex],
      poses: newPoses,
      videoState: "tagPose"
    });
  };

  makeScreenshots = () => {
    const captureInterval = setInterval(() => {
      this.canvasRef.current.width = this.state.width;
      this.canvasRef.current.height = this.state.height;
      const ctx = this.canvasRef.current.getContext("2d");

      ctx.translate(this.state.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(
        this.videoRef.current,
        0,
        0,
        this.state.width,
        this.state.height
      );
      const dataURI = this.canvasRef.current.toDataURL("image/png");
      this.audioRef.current.play();
      this.setState(prevState => {
        const newPoses = prevState.poses.slice();
        newPoses.push({
          src: dataURI,
          timeStamp: new moment().valueOf(),
          saved: false,
          tag: null,
          poseData: null,
          selected: false
        });
        return {
          ...prevState,
          poses: newPoses,
          captureInterval
        };
      });
    }, this.state.captureDelay * 1000);
  };

  handleTagPose = async punchType => {
    const newPoses = this.state.poses.slice();
    const currentPose = newPoses.find(
      pose => pose.timeStamp === this.state.currentPose.timeStamp
    );

    if (currentPose.saved) {
      try {
        await this.deletePunchData({
          timeStamp: currentPose.timeStamp,
          tag: currentPose.tag
        });
        currentPose.tag = punchType;

        await this.savePunchData({
          timeStamp: currentPose.timeStamp,
          tag: currentPose.tag,
          poseData: currentPose.poseData,
          screenshot: this.canvasRef.current.toDataURL('image/png')
        });
      } catch (err) {
        console.log("Unable to save pose");
      }
    } else {
      try {
        currentPose.tag = punchType;
        await this.savePunchData({
          timeStamp: currentPose.timeStamp,
          tag: currentPose.tag,
          poseData: currentPose.poseData,
          screenshot: this.canvasRef.current.toDataURL('image/png')
        });
      } catch (err) {
        console.log("Unable to save pose");
      }
    }
    currentPose.saved = true;
    this.setState({
      currentPose
    });
  };

  deletePunchData = pose => {
    return fetch("http://localhost:3015/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      mode: "cors",
      body: JSON.stringify(pose)
    });
  };

  savePunchData = pose => {
    return fetch("http://localhost:3015/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      mode: "cors",
      body: JSON.stringify(pose)
    });
  };

  handleDeletePunch = async () => {
    const newPoses = this.state.poses.slice();
    const currentPose = newPoses.find(
      pose => pose.timeStamp === this.state.currentPose.timeStamp
    );

    try {
      await this.deletePunchData({
        timeStamp: currentPose.timeStamp,
        tag: currentPose.tag
      });

      currentPose.saved = false;
      currentPose.tag = null;
      return this.setState({
        currentPose
      });
    } catch (err) {
      console.log("Unable to delete pose");
    }
  };

  handleDelayChange = e => {
    this.setState({
      captureDelay: e.target.value
    });
  };

  handleNextImage = async () => {
    const newPoses = this.state.poses.slice();
    let currentPoseIndex = newPoses.findIndex(
      pose => pose.timeStamp === this.state.currentPose.timeStamp
    );
    newPoses.forEach(pose => (pose.selected = false));

    currentPoseIndex = (currentPoseIndex + 1) % this.state.poses.length;

    const image = new Image();
    image.src = newPoses[currentPoseIndex].src;

    newPoses[currentPoseIndex].selected = true;
    newPoses[currentPoseIndex].poseData = await this.processPose(image);

    this.setState({
      currentPose: newPoses[currentPoseIndex],
      poses: newPoses
    });
  };

  render() {
    const displayRecordControls = () => {
      if (!this.state.recordingState) {
        return;
      }

      if (this.state.recordingState === "stopped") {
        return (
          <Col className={styles.videoButtonContainer}>
            <Button
              className={styles.videoControl}
              onClick={() => this.setRecordingState({ id: "record" })}
            >
              Record
            </Button>
          </Col>
        );
      } else {
        return (
          <Col className={styles.videoButtonContainer}>
            <Button
              className={styles.videoControl}
              onClick={() => this.setRecordingState({ id: "stop" })}
            >
              Stop
            </Button>
          </Col>
        );
      }
    };

    const displayPoses = () => {
      return this.state.poses.map(pose => {
        return (
          <div className={styles.poseContainer} key={pose.timeStamp}>
            <img
              className={`${styles.pose} ${
                pose.selected ? styles.poseSelected : ""
              }`}
              src={pose.src}
              height="75px"
              alt="Recording Video"
              onClick={event =>
                this.handleClickedPose(pose.timeStamp, event.target)
              }
            />
            <div className={styles.poseStatus}>
              {pose.saved ? "\u{2705}" : "\u{274C}"}
            </div>
          </div>
        );
      });
    };

    const displayPoseTaggingTools = () => {
      return (
        <Col xs={4} className={styles.poseTagContainer}>
          <div>
            <div className={styles.poseTagHeader}>Tag Punch Type</div>
          </div>
          <div className={styles.poseTagRow}>
            <Button
              className={
                this.state.currentPose.tag === "jab"
                  ? styles.tagButtonSelected
                  : ""
              }
              onClick={() => this.handleTagPose("jab")}
            >
              Jab
            </Button>
            <Button
              className={
                this.state.currentPose.tag === "powerRear"
                  ? styles.tagButtonSelected
                  : ""
              }
              onClick={() => this.handleTagPose("powerRear")}
            >
              Power Rear
            </Button>
          </div>
          <div className={styles.poseTagCategory}>Hook</div>
          <div className={styles.poseTagRow}>
            <Button
              className={
                this.state.currentPose.tag === "leftHook"
                  ? styles.tagButtonSelected
                  : ""
              }
              onClick={() => this.handleTagPose("leftHook")}
            >
              Left Hook
            </Button>
            <Button
              className={
                this.state.currentPose.tag === "rightHook"
                  ? styles.tagButtonSelected
                  : ""
              }
              onClick={() => this.handleTagPose("rightHook")}
            >
              Right Hook
            </Button>
          </div>
          <div className={styles.poseTagCategory}>Uppercut</div>
          <div className={styles.poseTagRow}>
            <Button
              className={
                this.state.currentPose.tag === "leftUppercut"
                  ? styles.tagButtonSelected
                  : ""
              }
              onClick={() => this.handleTagPose("leftUppercut")}
            >
              Left Uppercut
            </Button>
            <Button
              className={
                this.state.currentPose.tag === "rightUppercut"
                  ? styles.tagButtonSelected
                  : ""
              }
              onClick={() => this.handleTagPose("rightUppercut")}
            >
              Right Uppercut
            </Button>
          </div>
          <div className={styles.poseTagCategory}>Body Hook</div>
          <div className={styles.poseTagRow}>
            <Button
              className={
                this.state.currentPose.tag === "leftBodyHook"
                  ? styles.tagButtonSelected
                  : ""
              }
              onClick={() => this.handleTagPose("leftBodyHook")}
            >
              Left Body Hook
            </Button>
            <Button
              className={
                this.state.currentPose.tag === "rightBodyHook"
                  ? styles.tagButtonSelected
                  : ""
              }
              onClick={() => this.handleTagPose("rightBodyHook")}
            >
              Right Body Hook
            </Button>
          </div>
          <div className={styles.poseTagCategory}>Other</div>
          <div className={styles.poseTagRow}>
            <Button onClick={() => this.handleDeletePunch()}>Delete</Button>
            <Button onClick={() => this.handleNextImage()}>Next</Button>
          </div>
        </Col>
      );
    };

    return (
      <Layout>
        <audio ref={this.audioRef} src={beep} />
        <Container className={styles.capturePoseContainer}>
          <Row>
            <Col className={styles.debugContainer}>
              <Button onClick={this.toggleShowDebug}>Show Debug Lines</Button>
              <Label className={styles.label}>
                Screenshot timer
                <Input
                  type="number"
                  min="0"
                  value={this.state.captureDelay}
                  onChange={this.handleDelayChange}
                />
                secs
              </Label>
            </Col>
          </Row>
          <Row>
            <Col>
              <video
                ref={this.videoRef}
                srcobject={this.currentStream}
                className={`${styles.video} ${
                  this.state.recordingState === "recording"
                    ? styles.videoRecording
                    : styles.notRecording
                }`}
              />
              <canvas className={styles.canvas} ref={this.canvasRef} />
            </Col>
            {this.state.videoState === "tagPose"
              ? displayPoseTaggingTools()
              : ""}
          </Row>
          <Row>{displayRecordControls()}</Row>
          <Row>
            <Col className={styles.recordedPosesContainer}>
              {displayPoses()}
            </Col>
          </Row>
        </Container>
      </Layout>
    );
  }
}

export default NewRecordingPage;
