// script.js (เวอร์ชัน Multi-page)

const liffId = "YOUR_LIFF_ID"; // ใส่ LIFF ID ของคุณ
let allFreelancers = [];

// --- โค้ดใหม่: ส่วนควบคุมการเปลี่ยนหน้า ---
document.addEventListener('DOMContentLoaded', function () {
    const navButtons = document.querySelectorAll('.bottom-nav button');
    const pages = document.querySelectorAll('.page');

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetPageId = button.dataset.page;

            // ซ่อนทุกหน้า
            pages.forEach(page => page.classList.remove('active'));
            // แสดงหน้าที่ต้องการ
            document.getElementById(targetPageId).classList.add('active');

            // อัปเดตปุ่ม active
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });

    // เริ่มต้น LIFF และดึงข้อมูล
    initializeLiff();
});
// --- จบส่วนควบคุมการเปลี่ยนหน้า ---

async function initializeLiff() {
    try {
        await liff.init({ liffId: liffId });
        
        if (!liff.isLoggedIn()) {
            liff.login();
            return;
        }
        
        const profile = await liff.getProfile();

        // --- โค้ดใหม่: นำข้อมูลโปรไฟล์ไปแสดงผล ---
        // หน้า Search
        document.getElementById('user-greeting').innerText = `สวัสดี, ${profile.displayName}!`;
        // หน้า Profile
        document.getElementById('profile-picture').src = profile.pictureUrl;
        document.getElementById('profile-name').innerText = profile.displayName;

        // หลังจากได้โปรไฟล์แล้ว ค่อยดึงข้อมูลฟรีแลนซ์
        fetchFreelancers();

    } catch (e) {
        console.error('LIFF Initialization failed', e);
    }
}

// ฟังก์ชัน fetchFreelancers, displayFreelancers, filterFreelancers (เหมือนเดิม)
async function fetchFreelancers() {
    const listElement = document.getElementById('freelancer-list');
    try {
        const database = firebase.database();
        const snapshot = await database.ref('freelancers').once('value');
        const freelancersData = snapshot.val();
        allFreelancers = Object.values(freelancersData || {});
        displayFreelancers(allFreelancers);
    } catch (error) {
        console.error('Failed to fetch freelancers', error);
        listElement.innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    }
}

function displayFreelancers(freelancers) {
    const listElement = document.getElementById('freelancer-list');
    listElement.innerHTML = '';
    if (freelancers.length === 0) {
        listElement.innerHTML = '<p>ไม่พบฟรีแลนซ์</p>';
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
                <a href="${f.portfolio_url}" target="_blank" class="portfolio-btn">ดูผลงาน</a>
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
