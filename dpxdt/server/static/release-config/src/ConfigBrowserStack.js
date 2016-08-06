/* @flow */
import React, { Component } from 'react';
import {
  ControlLabel,
} from 'react-bootstrap';

import BrowserStackDesiredCapabilities from './BrowserStackDesiredCapabilities.js';
import FormGroupControl from './FormGroupControl.js';

type ConfigBrowserStackProps = {
  buildID: string,
  fields: Object,
};

const handleAddBrowserStackDesiredCapabilities = () => {

};

const ConfigBrowserStack = (props: ConfigBrowserStackProps) => {
  const {
    fields: {
      command_executor,
      desired_capabilities,
    },
  } = props;
  return (
    <div>
      <p>
        Courtesy of
        {' '}
        <a
          href="https://www.browserstack.com/automate/python" target="_blank"
          style={{ display: 'inline-block' }}>
          <img
            alt=""
            height="40"
            src="//pbs.twimg.com/profile_images/451968255846928384/0pyDMTyp.png"
          />
          {' '}
          BrowserStack
        </a>
      </p>

      <FormGroupControl
        field={command_executor}
        label="Command Executor"
        placeholder="http://username:password@hub.browserstack.com:80/wd/hub"
      />

      <ControlLabel>Desired Capabilities</ControlLabel>
      <BrowserStackDesiredCapabilities
        onAdd={dc => { desired_capabilities.addField(JSON.stringify(dc)) }}
      />
      {desired_capabilities.map((desired_capability, i) =>
        <FormGroupControl
          arrayFields={desired_capabilities}
          arrayIndex={i}
          field={desired_capability}
          key={i}
          readOnly={true}
          type="textarea"
        />)}
    </div>
  );
};

export default ConfigBrowserStack;