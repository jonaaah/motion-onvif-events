#!/usr/bin/env node

const {Cam} = require('onvif');
const fetch = require('node-fetch');
const {ArgumentParser} = require('argparse');
const pjson = require('./package.json');

let MotionTopic = {
  CELL_MOTION_DETECTOR: 'CELL_MOTION_DETECTOR',
  MOTION_ALARM: 'MOTION_ALARM',
};

class Monitor {
  constructor(onvifCam) {
    this.onvifCam = onvifCam;
    this.lastMotionDetectedState = null;
    this.topic = MotionTopic.MOTION_ALARM;
  }

  log(msg, ...rest) {
    console.log(`[camera]: ${msg}`, ...rest);
  }

  async start() {
    this.onvifCam.on('event', camMessage => this.onEventReceived(camMessage));
    this.log('Started');
  }

  onEventReceived(camMessage) {
    const topic = camMessage.topic._;
    if (topic.match(/RuleEngine\/CellMotionDetector\/Motion$/)) {
      this.onMotionDetectedEvent(camMessage);
    }
  }

  onMotionDetectedEvent(camMessage) {
    const isMotion = camMessage.message.message.data.simpleItem.$.Value;
    if (this.lastMotionDetectedState !== isMotion) {
      this.log(`CellMotionDetector: Motion Detected: ${isMotion}`);
    }
    this.lastMotionDetectedState = isMotion
  }

  static createCamera(conf) {
    return new Promise(resolve => {
      const cam = new Cam(conf, () => resolve(cam));
    })
  }

  static async create({hostname, username, password, port}) {
    const cam = await this.createCamera({
      hostname,
      username,
      password,
      port
    });
    return new Monitor(cam);
  }
}

async function start(args) {
  const monitor = await Monitor.create({
    hostname: args.hostname,
    username: args.username,
    password: args.password,
    port: args.port
      });
  monitor.start();
}

function main() {
  const parser = new ArgumentParser({
    addHelp: true,
    description: 'ONVIF motion detection events',
    version: pjson.version,
  });
  parser.addArgument(['-c', '--hostname'], {
    help: 'hostname/IP of the ONVIF camera',
    required: true
  });
  parser.addArgument(['-u', '--username'], {
    help: 'username for the ONVIF camera'
  });
  parser.addArgument(['-p', '--password'], {
    help: 'password for the ONVIF camera'
  });
  parser.addArgument(['-o', '--port'], {
    help: 'port for the ONVIF camera'
  });
  const args = parser.parseArgs();

  start(args);
}

main();
