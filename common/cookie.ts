export default function (str: string) {
    const cookies = {};
    if(typeof str !=="string"){
        return cookies
    }
    str.split(';').forEach(cookie => {
        const parts = cookie.match(/(.*?)=(.*)$/)
        if (!parts || parts.length < 3) {
            return
        }
        cookies[parts[1].trim()] = (parts[2] || '').trim();
    });
    return cookies;
};
