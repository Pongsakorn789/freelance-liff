// !!! สำคัญ: แก้เป็น LIFF ID ของคุณ !!!
const liffId = "YOUR_LIFF_ID"; 
let allFreelancers = [];

// --- ส่วนควบคุมการเลือก Role และการเปลี่ยนหน้า ---
document.addEventListener('DOMContentLoaded', function () {
    const roleSelectionPage = document.getElementById('page-role-selection');
    const mainApp = document.getElementById('main-app');
    const clientButton = document.getElementById('client-button');

    clientButton.addEventListener('click', () => {
        roleSelectionPage.style.display = 'none';
        mainApp.style.display = 'block';
        initializeLiff(); 
    });

    const navButtons = document.querySelectorAll('.bottom-nav button');
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetPageId = button.dataset.page;
            document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
            document.getElementById(targetPageId).classList.add('active');
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });
});

// --- ฟังก์ชันหลักของ LIFF App ---
async function initializeLiff() {
    try {
        await liff.init({ liffId: liffId });
        
        if (!liff.isLoggedIn()) {
            liff.login();
            return;
        }
        
        const profile = await liff.getProfile();

        // นำข้อมูลโปรไฟล์ไปแสดงผล
        document.getElementById('user-greeting').innerText = `สวัสดี, ${profile.displayName}!`;
        document.getElementById('profile-picture').src = profile.pictureUrl;
        document.getElementById('profile-name').innerText = profile.displayName;

        fetchFreelancers();

    } catch (e) {
        console.error('LIFF Initialization failed', e);
        alert('LIFF Initialization failed. Please open from LINE app.');
    }
}

// --- ฟังก์ชันจัดการข้อมูลฟรีแลนซ์ ---
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
        listElement.innerHTML = '<p>ไม่พบฟรีแลนซ์</p>';
        return;
    }
    freelancers.forEach(f => {
        const card = document.createElement('div');
        card.className = 'freelancer-card';
        card.innerHTML = `
            <img src="${f.image_url || 'https://via.placeholder.com/60'}" alt="${f.name}">
            <div class="freelancer-info">
                <h3>${f.name}</h3>
                <p>${f.skills ? f.skills.replace(/,/g, ', ') : 'No skills listed'}</p>
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

// ผูก event listener กับช่อง search (ต้องทำหลังจาก DOM โหลดแล้ว)
document.addEventListener('DOMContentLoaded', () => {
    const searchBox = document.getElementById('search-box');
    if (searchBox) {
        searchBox.addEventListener('input', filterFreelancers);
    }
});
