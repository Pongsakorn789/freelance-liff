// !!! ใส่ LIFF ID ของคุณที่นี่ !!!
const liffId = "2007867348-RQ0pAK5j";

async function main() {
    try {
        await liff.init({ liffId: liffId });
        if (!liff.isLoggedIn()) {
            liff.login();
            return;
        }
        const profile = await liff.getProfile();
        document.getElementById('pictureUrl').src = profile.pictureUrl;
        document.getElementById('displayName').innerText = profile.displayName;
    } catch (e) {
        alert("Initialization Failed!\n" + JSON.stringify(e));
    }
}
main();
