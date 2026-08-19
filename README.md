# ShadowCam PoseCapture and Display Debug Tool
ShadowCam application for capturing and tagging punches for use in 
the frontend application.  The application uses a timer to record
screenshots that then a user can go back and tag the type
of punch that was thrown.  This data is then exported for use
in the frontend application when determining the punch type.  

This repo also contains a debugging tool for viewing punch data
after it has been extracted, along with the screenshots.

* [Instructions](#instructions)
* [Getting Started](#getting-started)
* [Prerequisites](#prerequisites)
* [Built With](#built-with)
* [Contributing](#contributing)
* [Example](#example)
* [Authors](#authors)

## Instructions

To run the Pose Capture Tool

1. Install the client packages in the repository root with `npm ci`.
2. Install the server packages with `cd server && npm ci`.
3. Return to the repository root and run the client and server with `npm start`.

The client is available on port 3010 and the server on port 3015. To run only
the client, use `npm run client`. To create or preview a production build, use
`npm run build` or `npm run preview`.

To run the Pose Debugging Tool

1. Ensure the server NPM packages have already been installed, see above for installation.
2. Change into the poseDisplay directory and install those NPM packages using ``` npm install ```
3. Start the liveServer using ``` npm start ```

Once all poses have been captured and tagged, you can export all pose data into one large
array for use in the frontend application by:

1.  Change into the /server directory of the pose-capture tool
2.  Extract all pose data with ``` node exportPoses ```

This will combine all pose data and tag the punch with the timestamp and type of punch, which
is useful when debugging the punch type.

## Getting Started
All needed NPM packages are included in the package.json file. 

## Prerequisites
Node.js `^20.19.0` or `>=22.12.0` and npm are required. All application
packages are declared in the client and server `package.json` files.

## Built With
[React](https://reactjs.org/)

and other great NPM packages.  See package.json for full list.

## Contributing
Feel free to fork into your own repo to add additional features.

## Example
![Example of Pose Capture Tool](https://raw.githubusercontent.com/DryWaters/pose-capture/master/demo_punch_tag.png)

![Example of Pose Debug Tool](https://raw.githubusercontent.com/DryWaters/pose-capture/master/demo_debug_tool.PNG)

## Authors
[Daniel Waters](https://www.watersjournal.com)
