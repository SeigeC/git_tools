import OTPAuth from 'otpauth';
import FormData from 'form-data';
import fetch from 'node-fetch';
import store from './store'

const {username, password, otpauth, session, login_url, rider_url, codesync_url, git_url} = store.oa
export {username, password, otpauth, session, login_url, rider_url, codesync_url, git_url}
export default async function () {
    // Create a new TOTP object.
    let totp = OTPAuth.URI.parse(otpauth);

    // Generate a token.
    let token = totp.generate();

    const formdata = new FormData();
    formdata.append("username", username);
    formdata.append("password", password);
    formdata.append("token", token);
    formdata.append("encode", "true");
    formdata.append("ts", new Date().getTime() / 1000);

    const requestOptions = {
        method: 'POST',
        headers: {
            "cookie": `session=${session}`,
            "origin": `https://${login_url}`,
            "sec-ch-ua": "\" Not;A Brand\";v=\"99\", \"Microsoft Edge\";v=\"91\", \"Chromium\";v=\"91\"",
            "sec-ch-ua-mobile": "?0",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "same-origin",
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.70",
            "x-requested-with": "XMLHttpRequest"
        },
        body: formdata,
    };

    const res = await fetch(`https://${login_url}/web/login.do`, requestOptions)
    const json = await res.json()
    return json?.code === 0? json: false
}
