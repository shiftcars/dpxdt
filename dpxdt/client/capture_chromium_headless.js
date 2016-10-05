
const cri = require('chrome-remote-interface');
const fs = require('fs');
let tabManager;

/*
const spawn = require('child_process').spawn;
const PATH_TO_HEADLESS_CHROME = 'headless_shell';
// Start a background process for the chrome-remote-interface to connect to
const child = spawn(
  PATH_TO_HEADLESS_CHROME,
  [
    '--no-sandbox',
    '--remote-debugging-port=9222',
    '--deterministic-fetch',
    '--hide-scrollbars',
    '--window-size=480,1024',
  ],
  {
    detached: true,
    stdio: [
      'ignore', // stdin
      'ignore', // stdout
      'ignore', // stderr
    ],
  });
child.unref();
*/

// Read and validate config.
let configPath = null;
let outputPath = null;
console.log('process.argv', process.argv)
if (process.argv.length == 4) {
  configPath = process.argv[2];
  outputPath = process.argv[3];
} else {
  console.log('Usage: node capture_chromium_headless.js <config.js> <outputPath>');
  process.exit(1);
}

let config = {};
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
  console.log('Could not read config at "' + configPath + '":\n' + e);
  process.exit(1);
}
const requiredConfigFields = ['targetUrl'];
requiredConfigFields.forEach(field => {
  if (!config[field]) {
    console.log('Missing required field: ' + field);
    process.exit(1);
  }
});
console.log('config', config);

const targetUrl = config.targetUrl;
const configResourcesToIgnore = config.resourcesToIgnore || [];
const resourcesToIgnore = [
  ...configResourcesToIgnore,
  'https://cdn.optimizely.com/js/323115383.js',
  'https://cdn.segment.com/analytics.js/v1/oD9PafeNRrJRbC3NL41R8DgV8SANLDZ9/analytics.min.js',
  'https://connect.facebook.net/en_US/sdk.js',
  'https://cloud.typography.com/6825112/671726/css/fonts.css',
];
const viewportSize = config.viewportSize || {
  width: 1280,
  height: 3000,
};

takeScreenshotInNewTab(config.targetUrl, resourcesToIgnore, viewportSize, outputPath);


/*
// Comment the config parsing above and uncomment this for manual testing
const targetURL = 'https://shift.com/home';
const resourcesToIgnore = [
  'https://cdn.optimizely.com/js/323115383.js',
  'https://cdn.segment.com/analytics.js/v1/oD9PafeNRrJRbC3NL41R8DgV8SANLDZ9/analytics.min.js',
  'https://connect.facebook.net/en_US/sdk.js',
  'https://cloud.typography.com/6825112/671726/css/fonts.css',
];
const viewportSize = {
  width: 1280,
  height: 3000,
};
const outputPath = 'screenshot.png';
takeScreenshotInNewTab(targetURL, resourcesToIgnore, viewportSize, outputPath);
*/


/*******************************************************************************/


function takeScreenshotInNewTab(targetURL, resourcesToIgnore, viewportSize, outputPath) {
  executeInTab(devtools => {
    return loadPageAndTakeScreenshot(devtools, targetURL, resourcesToIgnore, viewportSize, outputPath);
  }).then(result => {
    console.log('takeScreenshotInNewTab ALL DONE.');
    process.exit(0);
  });
}

function getTabManager() {
  if (!tabManager) {
    tabManager = new Promise((resolve, reject) => {
      const emitter = cri({ tab: `ws://localhost:${9222}/devtools/browser` }, resolve);
      emitter.once('disconnect', () => {
        tabManager = null;
        reject(new Error('Tabmanager disconnected'));
      });
      emitter.once('error', error => {
        tabManager = null;
        reject(error);
      });
    });
  }
  return tabManager;
}

function executeInTab(workFn) {
  return getTabManager()
    .then(tabManager => {
      return tabManager.Target.createTarget({ url: 'about:blank' })
        .then(({ targetId }) => {
          return cri.List({ port: 9222 })
            .then(list => {
              var url = list.find(target => target.id === targetId).webSocketDebuggerUrl;
              return cri({ tab: url });
            })
            .then(devtools => workFn(devtools))
            .then(result => {
              console.log('closing tab with targetId', targetId)
              return tabManager.Target.closeTarget({ targetId })
                .then(() => result);
            }, error => {
              return tabManager.Target.closeTarget({ targetId })
                .then(() => {
                  throw error;
                });
            });
        });
    })
    .catch(err => {
      console.log('getTabManager failed', err);
    });
}

function loadPageAndTakeScreenshot(client, targetURL, resourcesToIgnore, viewportSize, outputPath) {
  return new Promise((resolve, reject) => {
    const { Emulation, Network, Page } = client;
    console.log('loadPageAndTakeScreenshot!!')

    let ResourceStatus = {
      Done: 'Done',
      Error: 'Error',
      Timeout: 'Timeout',
      Pending: 'Pending',
    };

    let resourceStatusMap = {};

    Emulation.setVisibleSize({
      width: viewportSize.width,
      height: viewportSize.height,
    });

    if (resourcesToIgnore && resourcesToIgnore.length) {
      resourcesToIgnore.forEach(url => {
        console.log('× addBlockedURL', url);
        Network.addBlockedURL({
          url: url,
        });
      });
    }

    Network.setUserAgentOverride({ userAgent: 'dpxdt-lindsey' });

    Network.requestWillBeSent(params => {
      const url = params.request.url;
      console.log(`-> ${params.requestId} ${url.substring(0, 150)}`);
      // Always reset the status to pending each time a new request happens.
      // This handles the case where the page or JS causes a resource to reload
      // for some reason, expecting a different result.
      resourceStatusMap[params.requestId] = ResourceStatus.Pending;
    });

    Network.loadingFailed(params => {
      console.log('*** loadingFailed: ', params.requestId);
      resourceStatusMap[params.requestId] = ResourceStatus.Error;
    });

    Network.loadingFinished(params => {
      console.log('<-', params.requestId, params.encodedDataLength);
      resourceStatusMap[params.requestId] = ResourceStatus.Done;
    });

    Page.loadEventFired(
      () => {
        console.log('loadEventFired!');
        waitForReady();
      }
    );

    function takeScreenshotAndFinish() {
      console.log('takeScreenshotAndFinish');
      Page.captureScreenshot().then(
        v => {
          console.log('writing screenshot to', outputPath);
          fs.writeFileSync(outputPath, v.data, 'base64');
          console.log(`Image saved as ${outputPath}`);
          client.close();
          resolve();
        }
      );
    }

    const waitForReadyTimeoutMS = 500;
    function waitForReady() {
      let totals = {};
      for (let requestId in resourceStatusMap) {
        let status = resourceStatusMap[requestId];
        let value = totals[status] || 0;
        totals[status] = value + 1;
      }
      console.log('Status of all resources:', JSON.stringify(totals));

      var pending = totals[ResourceStatus.Pending] || 0;
      if (!pending) {
        console.log('No more resources are pending!');
        takeScreenshotAndFinish();
      } else {
        for (let requestId in resourceStatusMap) {
          if (resourceStatusMap[requestId] == ResourceStatus.Pending) {
            console.log('Still waiting for: ' + requestId);
          }
        }
        setTimeout(waitForReady, waitForReadyTimeoutMS);
      }
    }

    Promise.all([
      Network.enable(),
      Page.enable()
    ]).then(() => {
      console.log('Page.navigate', targetURL)
      Page.navigate({ url: targetURL });
    }).catch((err) => {
      console.error(`ERROR: ${err.message}`);
      client.close();
      reject(err);
    });
  });
}

