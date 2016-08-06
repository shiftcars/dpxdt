/* @flow */
import React, { Component } from 'react';
import {
  Button,
  ControlLabel,
  Col,
  FormControl,
  FormGroup,
  Row,
} from 'react-bootstrap';

import BrowserStackData from './BrowserStackData.js';

BrowserStackData.browserNames = {
  chrome: 'Chrome',
  firefox: 'Firefox',
  ie: 'IE',
  mobile: 'Mobile',
  //yandex: 'Yandex',
  safari: 'Safari',
  tablet: 'Tablet',
  //opera: 'Opera',
};

BrowserStackData.os = {
  win10: {
    icon: 'icon-windows8',
    os: 'Windows',
    version: '10',
  },
  'win8.1': {
    icon: 'icon-windows8',
    os: 'Windows',
    version: '8.1',
  },
  macelc: {
    icon: 'icon-macelc',
    os: 'OS X',
    version: 'El Capitan',
  },
  macyos: {
    icon: 'icon-osxyosemite',
    os: 'OS X',
    version: 'Yosemite',
  },
  ios: {
    icon: 'icon-ios',
    os: 'iOS',
    platform: 'MAC',
    version: '',
  },
  android: {
    icon: 'icon-android',
    os: 'Android',
    platform: 'ANDROID',
    version: '',
  },
};

type BrowserStackDesiredCapabilitiesProps = {
  onAdd: Function,
};

type BrowserStackDesiredCapabilitiesState = {
  os: ?string,
  browser: ?string,
  resolution: ?string,
};

const isMobileDeviceOS = (os) => {
  return ['android', 'ios'].indexOf(os) !== -1;
};

const isUsefulBrowser = (browser) => {
  return !!BrowserStackData.browserNames[browser];
};

// Why is this crap in their data?
const replaceMobileDeviceCrap = (str) => {
  return str.replace(/\-.+$/, '');
}

const filterBrowserVersionsForOS = (browsersByOS, browser, os) => {
  return isMobileDeviceOS(os) ?
    browsersByOS[browser].map(replaceMobileDeviceCrap) :
    // we don't need to offer every version under the sun
    browsersByOS[browser].reverse().slice(0, 5);
}

const browserVersionDelimiter = '-';

//https://dgzoq9b5asjg1.cloudfront.net/production/images/static/sprites/browsers/browser_and_os@2x.png
export default class BrowserStackDesiredCapabilities extends Component {
  props: BrowserStackDesiredCapabilitiesProps;

  constructor() {
    super();
    this.state = {
      os: null,
      browser: null,
      resolution: null,
    };
  }

  handleChangeOS = (e) => {
    let os = e.currentTarget.value;
    let resolution = isMobileDeviceOS(os) ?
      null :
      BrowserStackData.resolutionOptions[os][0];
    this.setState({
      os,
      browser: null,
      resolution,
    });
  };

  handleChangeBrowser = (e) => {
    this.setState({
      browser: e.currentTarget.value,
    });
  };

  handleChangeResolution = (e) => {
    this.setState({
      resolution: e.currentTarget.value,
    });
  };

  getDesiredCapabilitiesMap() {
    let [browser, version] = this.state.browser.split(browserVersionDelimiter);
    let map;
    if (!isMobileDeviceOS(this.state.os)) {
      map = {
        browser: BrowserStackData.browserNames[browser],
        browser_version: version,
        os: BrowserStackData.os[this.state.os].os,
        os_version: BrowserStackData.os[this.state.os].version,
        resolution: this.state.resolution,
      };
    } else {
      let browserName = 'android';
      if (this.state.os === 'ios') {
        browserName = browser === 'mobile' ? 'iPhone' : 'iPad';
      }
      let platform = this.state.os == 'ios' ? 'MAC' : 'ANDROID';
      let device = version;
      map = {
        browserName,
        platform,
        device,
      };
    }
    return map;
  }

  handleClickAdd = (e) => {
    this.props.onAdd(this.getDesiredCapabilitiesMap());
    this.setState({
      os: null,
      browser: null,
      resolution: null,
    });
  };

  render() {
    let osOptions = Object.keys(BrowserStackData.os).map(os =>
      <option key={os} value={os}>
        {BrowserStackData.os[os].os}
        {' '}
        {BrowserStackData.os[os].version}
      </option>
    );

    let browserOptions;
    if (this.state.os) {
      let browsersByOS = BrowserStackData.browserVersion[this.state.os];
      browserOptions = Object.keys(browsersByOS).filter(isUsefulBrowser).sort().map(browser =>
        <optgroup key={browser} label={BrowserStackData.browserNames[browser]}>
          {filterBrowserVersionsForOS(browsersByOS, browser, this.state.os).map(version =>
            <option
              key={version}
              value={browser + browserVersionDelimiter + version}
            >
              {
                isMobileDeviceOS(this.state.os) ?
                null :
                BrowserStackData.browserNames[browser] + ' '
              }
              {version}
            </option>
          )}
        </optgroup>
      );
    }

    let resolutionOptions;
    if (this.state.os && !isMobileDeviceOS(this.state.os)) {
      let resolutionsByOS = BrowserStackData.resolutionOptions[this.state.os];
      resolutionOptions = resolutionsByOS.map(res =>
        <option key={res}>{res}</option>
      );
    }
    return (
      <div>
        <Row>
          <Col md={3} xs={3}>
            <FormGroup controlId="os">
              <ControlLabel>OS</ControlLabel>
              <FormControl
                componentClass="select"
                onChange={this.handleChangeOS}
                placeholder="select"
              >
                <option>Pick one</option>
                {osOptions}
              </FormControl>
            </FormGroup>
          </Col>
          <Col md={3} xs={3}>
            <FormGroup controlId="browser">
              <ControlLabel>
                {
                  isMobileDeviceOS(this.state.os) ?
                  'Device' :
                  'Browser'
                }
              </ControlLabel>
              <FormControl
                componentClass="select"
                onChange={this.handleChangeBrowser}
                placeholder="select">
                {
                  this.state.os ?
                  <option>select</option> :
                  null
                }
                {browserOptions}
              </FormControl>
            </FormGroup>
          </Col>
          {
            isMobileDeviceOS(this.state.os) ?
            null :
            <Col md={3} xs={3}>
              <FormGroup controlId="resolution">
                <ControlLabel>Resolution</ControlLabel>
                <FormControl
                  componentClass="select"
                  onChange={this.handleChangeResolution}
                  placeholder="select"
                  value={this.state.resolution}>
                  {resolutionOptions}
                </FormControl>
              </FormGroup>
            </Col>
          }
          <Col md={1} xs={1}>
            <ControlLabel>
              <span style={{ visibility: 'hidden' }}>Add</span>
            </ControlLabel>
            <Button
              onClick={this.handleClickAdd}
              disabled={!(this.state.os && this.state.browser)}
              type="button"
            >+</Button>
          </Col>
        </Row>
      </div>
    );
  }
}
