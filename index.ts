#!/usr/bin/env zx
/// <reference types="zx"/>
import prompts from 'prompts';
import {$} from 'zx'
// @ts-ignore
import func from './func/*'

$.verbose = false
const res = await func
const chose = await prompts({
    type: 'select',
    name: 'value',
    message: '你想要干什么',
    choices: res.map(item => ({title: item.description, value: item.default})),
    initial: 0
})
chose.value()
