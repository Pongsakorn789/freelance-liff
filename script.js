// script.js (เวอร์ชัน Firebase)

const liffId = "2007867348-j6VyLzkW"; // LIFF ID ของคุณ
let allFreelancers = [];

document.addEventListener('DOMContentLoaded', function () {
    initializeLiff();
    fetchFreelancers();

    const searchBox = document.getElementById('search-box');
    searchBox.addEventListener('input', filterFreelancers);
});

async function initializeLiff() {
    try {
        await liff.init({ liffId: liffId });
        if (!liff.isLoggedIn()) {
            liff.login();
        } else {
            const profile = await liff.getProfile();
            document.getElementById('user-greeting').innerText = `สวัสดี, ${profile.displayName}!`;
        }
    } catch (e) {
        console.error('LIFF Initialization failed', e);
    }
}

async function fetchFreelancers() {
    const listElement = document.getElementById('freelancer-list');
    try {
        // --- ดึงข้อมูลจาก Firebase ---
        const database = firebase.database();
        const snapshot = await database.ref('freelancers').once('value');
        const freelancersData = snapshot.val();
        // แปลง Object เป็น Array เพื่อให้ใช้งานได้
        allFreelancers = Object.values(freelancersData || {});
        // --- จบส่วนดึงข้อมูล ---

        displayFreelancers(allFreelancers);

    } catch (error) {
        console.error('Failed to fetch freelancers from Firebase', error);
        listElement.innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    }
}

function displayFreelancers(freelancers) {
    const listElement = document.getElementById('freelancer-list');
    listElement.innerHTML = '';

    if (freelancers.length === 0) {
        listElement.innerHTML = '<p>ไม่พบฟรีแลนซ์ที่ตรงกับเงื่อนไข</p>';
        return;
    }

    freelancers.forEach(f => {
        const card = document.createElement('div');
        card.className = 'freelancer-card';
        card.innerHTML = `
            <img src="${f.image_url || 'https://via.placeholder.com/150'}" alt="${f.name}">
            <div class="freelancer-info">
                <h3>${f.name}</h3>
                <p>${f.skills.replace(/,/g, ', ')}</p>
                <a href="${f.portfolio_url}" target="_blank">ดูผลงาน</a>
            </div>
        `;
        listElement.appendChild(card);
    });
}

function filterFreelancers() {
    const searchTerm = document.getElementById('search-box').value.toLowerCase();
    const filtered = allFreelancers.filter(f =>
        (f.name && f.name.toLowerCase().includes(searchTerm)) ||
        (f.skills && f.skills.toLowerCase().includes(searchTerm))
    );
    displayFreelancers(filtered);
}
