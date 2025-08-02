// !!! สำคัญ: แก้เป็น LIFF ID ของคุณ !!!
const liffId = "2007867348-RQ0pAK5j"; 
let allFreelancers = [];

// --- ฟังก์ชันหลักที่จะทำงานเมื่อหน้าเว็บโหลดเสร็จ ---
document.addEventListener('DOMContentLoaded', function () {
    main();
});

async function main() {
    console.log("Starting LIFF App...");
    try {
        // 1. เริ่มต้นการทำงานของ LIFF ทันที
        await liff.init({ liffId: liffId });
        console.log("LIFF Init successful.");

        // 2. ตรวจสอบว่าผู้ใช้ล็อกอินหรือยัง
        if (!liff.isLoggedIn()) {
            console.log("User not logged in. Redirecting to login...");
            liff.login();
            return; // หยุดการทำงานหลังจากสั่ง login
        }
        console.log("User is logged in.");

        // 3. โหลดข้อมูลทั้งหมดล่วงหน้า
        await loadAppData();

        // 4. ตั้งค่าการทำงานของปุ่มต่างๆ
        setupEventListeners();

    } catch (e) {
        console.error('LIFF Initialization failed', e);
        alert('LIFF Initialization failed. Error: ' + JSON.stringify(e));
    }
}

// --- ฟังก์ชันใหม่: โหลดข้อมูลแอปทั้งหมดล่วงหน้า ---
async function loadAppData() {
    console.log("Loading app data...");
    // ใช้ Promise.all เพื่อให้โหลดข้อมูลโปรไฟล์และฟรีแลนซ์ไปพร้อมๆ กัน
    await Promise.all([
        getUserProfile(),
        fetchFreelancers()
    ]);
    console.log("App data loaded.");
}

// --- ฟังก์ชันสำหรับตั้งค่า Event Listener ทั้งหมด ---
function setupEventListeners() {
    const roleSelectionPage = document.getElementById('page-role-selection');
    const mainApp = document.getElementById('main-app');
    const clientButton = document.getElementById('client-button');

    clientButton.addEventListener('click', () => {
        console.log("Client button clicked.");
        // เมื่อกดปุ่ม "ผู้จ้าง" ให้สลับหน้าอย่างเดียว
        roleSelectionPage.style.display = 'none';
        mainApp.style.display = 'block';
    });

    const navButtons = document.querySelectorAll('.bottom-nav button');
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const pageId = button.dataset.page;
            navigateTo(pageId);
        });
    });

    document.getElementById('back-to-chat-list').addEventListener('click', () => {
        navigateTo('page-chat');
    });

    const searchBox = document.getElementById('search-box');
    if (searchBox) {
        searchBox.addEventListener('input', filterFreelancers);
    }
    console.log("Event listeners setup complete.");
}

function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    document.querySelectorAll('.bottom-nav button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === pageId);
    });
    document.querySelector('.bottom-nav').style.display = pageId === 'page-chat-room' ? 'none' : 'flex';
}

// --- ฟังก์ชันดึงโปรไฟล์ตามสไลด์ ---
async function getUserProfile() {
    try {
        const profile = await liff.getProfile();
        document.getElementById('pictureUrl').src = profile.pictureUrl;
        document.getElementById('userId').innerHTML = `<b>User ID:</b> ${profile.userId}`;
        document.getElementById('displayName').innerText = profile.displayName;
        document.getElementById('statusMessage').innerHTML = `<b>Status:</b> ${profile.statusMessage || 'ไม่มีข้อความสถานะ'}`;

        if (liff.getDecodedIDToken()) {
            document.getElementById('email').innerHTML = `<b>Email:</b> ${liff.getDecodedIDToken().email}`;
        }
        console.log("User profile loaded.");
    } catch(err) {
        console.error("Error getting profile:", err);
    }
}

// --- ฟังก์ชันจัดการข้อมูลฟรีแลนซ์ ---
async function fetchFreelancers() {
    try {
        const database = firebase.database();
        const snapshot = await database.ref('freelancers').once('value');
        const freelancersData = snapshot.val();
        allFreelancers = Object.values(freelancersData || {});
        displayFreelancers(allFreelancers);
        displayChats();
        console.log("Freelancer data loaded and displayed.");
    } catch (error) {
        console.error('Failed to fetch freelancers from Firebase', error);
        document.getElementById('freelancer-list').innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    }
}

function displayFreelancers(freelancers) {
    const listElement = document.getElementById('freelancer-list');
    listElement.innerHTML = '';
    if (!freelancers || freelancers.length === 0) {
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

// --- ฟังก์ชันใหม่: จัดการหน้าแชท ---
function displayChats() {
    const chatListContainer = document.getElementById('chat-list-container');
    chatListContainer.innerHTML = '';
    if (!allFreelancers || allFreelancers.length === 0) return;
    
    allFreelancers.forEach(freelancer => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        chatItem.innerHTML = `
            <img src="${freelancer.image_url}" alt="${freelancer.name}">
            <div class="chat-info">
                <strong>${freelancer.name}</strong>
                <p>สถานะ: รอตอบกลับ</p>
            </div>
            <button class="contact-btn">คุยต่อ</button>
        `;
        chatItem.querySelector('.contact-btn').addEventListener('click', () => {
            openChatRoom(freelancer.name);
        });
        chatListContainer.appendChild(chatItem);
    });
}

function openChatRoom(freelancerName) {
    document.getElementById('chat-with-name').innerText = freelancerName;
    navigateTo('page-chat-room');
}

