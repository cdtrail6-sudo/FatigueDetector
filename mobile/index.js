/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
console.log("JS_START: index.js loaded");

AppRegistry.registerComponent(appName, () => App);
