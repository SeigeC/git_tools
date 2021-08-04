#!/usr/bin/env node --no-warnings --experimental-json-modules  --loader ts-node/esm
/// <reference types="zx"/>
import prompts from 'prompts';
import { $ } from 'zx'
import func from './func/index.js'
$.verbose = false
const res = await func
const chose = await prompts({
    type: 'select',
    name: 'value',
    message: '你想要干什么',
    choices: res.map(item => ({ title: item.description, value: item.default })),
    initial: 0
})
chose.value()