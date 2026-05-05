import { TextDecoder, TextEncoder } from "util";
import { ReadableStream } from "stream/web";
import { MessageChannel, MessagePort } from "worker_threads";

if (!global.TextDecoder) {
  global.TextDecoder = TextDecoder;
}

if (!global.TextEncoder) {
  global.TextEncoder = TextEncoder;
}

if (!global.ReadableStream) {
  global.ReadableStream = ReadableStream;
}

if (!global.MessageChannel) {
  global.MessageChannel = MessageChannel;
}

if (!global.MessagePort) {
  global.MessagePort = MessagePort;
}

const { configure } = require("enzyme");
const Adapter = require("enzyme-adapter-react-16");

configure({ adapter: new Adapter() });

