import * as posenet from "@tensorflow-models/posenet";
import NewRecordingPage, { POSE_NET_MODEL_CONFIG } from "./CapturePosePage";
import * as tfCore from "@tensorflow/tfjs-core";
import {
  drawBoundingBox,
  drawKeyPoints,
  drawSkeleton,
  processPose
} from "../../utils/poseUtils";

jest.mock("@tensorflow-models/posenet", () => ({
  load: jest.fn()
}));

jest.mock("../../utils/poseUtils", () => ({
  drawBoundingBox: jest.fn(),
  drawKeyPoints: jest.fn(),
  drawSkeleton: jest.fn(),
  processPose: jest.fn()
}));

const PARTS = [
  "nose",
  "leftEye",
  "rightEye",
  "leftEar",
  "rightEar",
  "leftShoulder",
  "rightShoulder",
  "leftElbow",
  "rightElbow",
  "leftWrist",
  "rightWrist",
  "leftHip",
  "rightHip",
  "leftKnee",
  "rightKnee",
  "leftAnkle",
  "rightAnkle"
];

const createPose = () => ({
  score: 0.99,
  keypoints: PARTS.map((part, index) => ({
    part,
    score: 0.9,
    position: { x: index * 10, y: index * 5 }
  }))
});

describe("CapturePosePage PoseNet integration", () => {
  let canvas;
  let context;
  let net;
  let page;
  let pose;

  beforeEach(() => {
    jest.clearAllMocks();
    context = {
      clearRect: jest.fn(),
      drawImage: jest.fn(),
      restore: jest.fn(),
      save: jest.fn()
    };
    canvas = {
      getContext: jest.fn(() => context),
      height: 0,
      width: 0
    };
    pose = createPose();
    net = {
      estimateSinglePose: jest.fn().mockResolvedValue(pose)
    };
    posenet.load.mockResolvedValue(net);
    processPose.mockReturnValue(new Array(34).fill(0));

    page = new NewRecordingPage({});
    page.canvasRef.current = canvas;
    page.state.poseNet.showDebug = false;
  });

  it("registers the aligned TensorFlow runtime through the component import", async () => {
    expect(require("@tensorflow/tfjs/package.json").version).toBe("3.21.0");
    expect(require("@tensorflow/tfjs-backend-webgl/package.json").version).toBe(
      "3.21.0"
    );
    expect(tfCore.version_core).toBe("3.21.0");
    expect(tfCore.findBackendFactory("cpu")).toEqual(expect.any(Function));

    await expect(tfCore.setBackend("cpu")).resolves.toBe(true);
    await tfCore.ready();
    expect(tfCore.getBackend()).toBe("cpu");

    const warning = jest.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const tensor = tfCore.tensor1d([1, 2, 3]);
      await expect(tensor.data()).resolves.toEqual(
        new Float32Array([1, 2, 3])
      );
      tensor.dispose();
    } finally {
      warning.mockRestore();
    }
  });

  it("loads the compatible MobileNet model and preserves the legacy input resolution", async () => {
    const result = await page.processPose({});

    expect(posenet.load).toHaveBeenCalledWith({
      architecture: "MobileNetV1",
      outputStride: 16,
      inputResolution: { width: 305, height: 225 },
      multiplier: 0.75,
      quantBytes: 4
    });
    expect(POSE_NET_MODEL_CONFIG).toEqual({
      architecture: "MobileNetV1",
      outputStride: 16,
      inputResolution: { width: 305, height: 225 },
      multiplier: 0.75,
      quantBytes: 4
    });
    expect(canvas).toMatchObject({ width: 640, height: 480 });
    expect(net.estimateSinglePose).toHaveBeenCalledWith(canvas, {
      flipHorizontal: false
    });
    expect(pose.keypoints).toHaveLength(17);
    expect(processPose).toHaveBeenCalledWith(pose);
    expect(result).toHaveLength(34);
    expect(drawKeyPoints).not.toHaveBeenCalled();
    expect(drawSkeleton).not.toHaveBeenCalled();
    expect(drawBoundingBox).not.toHaveBeenCalled();
  });

  it("reuses the model and forwards the current flipHorizontal setting", async () => {
    await page.processPose({});
    page.state.poseNet.flipHorizontal = true;
    await page.processPose({});

    expect(posenet.load).toHaveBeenCalledTimes(1);
    expect(net.estimateSinglePose).toHaveBeenNthCalledWith(2, canvas, {
      flipHorizontal: true
    });
  });
});
