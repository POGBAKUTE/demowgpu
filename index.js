/**
 * @format
 */

import 'react-native-gesture-handler';
import { TextDecoder, TextEncoder } from 'text-encoding';
if (typeof global.TextDecoder === 'undefined') global.TextDecoder = TextDecoder;
if (typeof global.TextEncoder === 'undefined') global.TextEncoder = TextEncoder;
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
