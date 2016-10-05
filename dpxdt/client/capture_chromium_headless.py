#!/usr/local/bin/python

# Copyright 2016 Lindsey Simon
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
# http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# This is a version of capture written to work with headless chrome.
# Big thanks to Chrome team and this article:
# http://www.zackarychapple.guru/chrome/2016/08/24/chrome-headless.html

# TODO(elsigh): Support cookies
# TODO(elsigh): Support resourcesToIgnore
# TODO(elsigh): Support httpUserName/httpPassWord
# TODO(elsigh): Support injectHeaders

import json
import logging
import os
import pprint
import subprocess
import shlex
import sys
import time

from dpxdt.client import process_worker
from dpxdt.client import workers

root = logging.getLogger()
root.setLevel(logging.DEBUG)

ch = logging.StreamHandler(sys.stdout)
ch.setLevel(logging.DEBUG)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(message)s\n')
ch.setFormatter(formatter)
root.addHandler(ch)

# TODO(elsigh): Make this
PATH_CHROMIUM_HEADLESS = "headless_shell"
CAPTURE_SCRIPT_PATH = os.path.join(os.path.dirname(__file__), 'capture_chromium_headless.js')

# Process the passed in config file
config_file_path = sys.argv[1]
output_file = sys.argv[2]

output_dir = os.path.dirname(output_file)
if not os.path.isdir(output_dir):
    os.makedirs(output_dir)

with open(config_file_path) as config_file:
    config = json.load(config_file)
logging.info("config JSON: %s", pprint.pformat(config))

assert config['targetUrl']
target_url = config['targetUrl']

viewport_size = '800x1200'
if 'viewportSize' in config:
    viewport_size = '%sx%s' % (config['viewportSize']['width'],
                               config['viewportSize']['height'])

resource_timeout_ms = config.get('resourceTimeoutMs', 60 * 1000)


class Error(Exception):
    """Base class for exceptions in this module."""

class TimeoutError(Exception):
    """Subprocess has taken too long to complete and was terminated."""


class HeadlessCaptureWorkflow():
    """Workflow that runs a subprocess.

    Returns:
        The return code of the subprocess.
    """

    def get_args(self):
        args = [
            'nodejs',
            CAPTURE_SCRIPT_PATH,
            '--screenshot="%s"' % output_file,
            '--window-size="%s"' % viewport_size,
            target_url,
        ]
        cmd = ' '.join(args)
        return shlex.split(cmd)

    def run(self):
        start_time = time.time()
        args = self.get_args()
        logging.info('item=%r Running subprocess: %r', self, args)
        try:
            if sys.platform == 'win32':
                process = subprocess.Popen(
                    args,
                    #stderr=subprocess.STDOUT,
                    #stdout=subprocess.STDOUT,
                    creationflags=0x208)
            else:
                process = subprocess.Popen(
                    args,
                    #stderr=subprocess.STDOUT,
                    #stdout=subprocess.STDOUT,
                    close_fds=True)
        except:
            e = sys.exc_info()[1]
            logging.error('item=%r Failed to run subprocess: %r %s',
                         self, ' '.join(args), e)
            raise

        while True:
            logging.info('item=%r Polling pid=%r, returncode=%r', self, process.pid, process.returncode)
            # NOTE: Use undocumented polling method to work around a
            # bug in subprocess for handling defunct zombie processes:
            # http://bugs.python.org/issue2475
            process._internal_poll(_deadstate=127)
            if process.returncode is not None:
                logging.info(
                    'item=%r Subprocess finished pid=%r, returncode=%r',
                    self, process.pid, process.returncode)
                return process.returncode

            now = time.time()
            run_time = now - start_time
            if run_time > resource_timeout_ms:
                logging.info('item=%r Subprocess timed out pid=%r',
                            self, process.pid)
                process.kill()
                logging.info(
                    'Sent SIGKILL to item=%r, pid=%s, run_time=%s' %
                    (self, process.pid, run_time))
                return 1


returncode = HeadlessCaptureWorkflow().run()
logging.info('DONE! returncode: %s', returncode)
if os.path.isfile(output_file):
    logging.info('Got a file at %s', output_file)
else:
    logging.info('No file at %s', output_file)
sys.exit()

