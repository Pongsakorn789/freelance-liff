// script.js (เวอร์ชันอัปเกรดสำหรับติดต่องาน)

const liffId = "2007867348-j6VyLzkW"; // LIFF ID ของคุณ
let allFreelancers = [];

document.addEventListener('DOMContentLoaded', function () {
    initializeLiffAndCheckAction(); // เปลี่ยนชื่อฟังก์ชันเป็นอันใหม่
});

async function initializeLiffAndCheckAction() {
    try {
        await liff.init({ liffId: liffId });

        // --- Logic ใหม่: ตรวจสอบ URL Parameter ---
        const params = new URLSearchParams(window.location.search);
        const freelancerId = params.get('freelancerId');

        if (freelancerId) {
            // ถ้ามี freelancerId ส่งมาด้วย (คือการกดปุ่ม "ติดต่องาน")
            // ให้เปิดหน้าแชทของฟรีแลนซ์คนนั้นทันที
            const lineChatUrl = `https://line.me/R/ti/p/~${freelancerId}`;

            // ใช้ liff.openWindow เพื่อประสบการณ์ที่ดีที่สุด
            liff.openWindow({
                url: lineChatUrl,
                external: true // บังคับให้เปิดในแอป LINE
            });

            // ไม่ต้องทำอะไรต่อหลังจากนี้
            return; 
        }

        // --- ถ้าไม่มี freelancerId (คือการเข้าเว็บตามปกติ) ---
        // ให้ทำงานเหมือนเดิม คือแสดงรายชื่อฟรีแลนซ์
        if (!liff.isLoggedIn()) {
            liff.login();
        } else {
            const profile = await liff.getProfile();
            document.getElementById('user-greeting').innerText = `สวัสดี, ${profile.displayName}!`;
            fetchFreelancers(); // เรียกฟังก์ชันดึงข้อมูล
        }
        // --- จบส่วน Logic ใหม่ ---

    } catch (e) {
        console.error('LIFF Initialization failed', e);
    }
}

// ฟังก์ชัน fetchFreelancers และอื่นๆ เหมือนเดิมทั้งหมด
async function fetchFreelancers() {
    const listElement = document.getElementById('freelancer-list');
    try {
        const database = firebase.database();
        const snapshot = await database.ref('freelancers').once('value');
        const freelancersData = snapshot.val();
        allFreelancers = Object.values(freelancersData || {});
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
