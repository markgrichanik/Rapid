#!/usr/bin/env node
global.Nightmare = require('nightmare');
global.moment = require('moment');
global.fs = require('fs');
global.Promise = require("bluebird");

global.session_key = "markgri17@gmail.com";
global.session_password = "RapidApi";
global.NUM_OF_RESULT = 10;


var lib= require('../lib/main.js');
lib.searchForCandidates();
