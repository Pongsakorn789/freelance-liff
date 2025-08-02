// !!! สำคัญ: แก้เป็น LIFF ID ของคุณ !!!
const liffId = "2007867348-RQ0pAK5j"; 
let allFreelancers = [];
let currentUserProfile = null;

// --- ฟังก์ชันหลักที่จะทำงานเมื่อหน้าเว็บโหลดเสร็จ ---
document.addEventListener('DOMContentLoaded', main);

// --- โครงสร้างใหม่ที่แน่นอนที่สุด ---
async function main() {
    console.log("App is starting...");
    try {
        // 1. รอให้ LIFF เริ่มต้นการทำงานให้เสร็จก่อนเป็นอันดับแรก
        await liff.init({ liffId: liffId });
        console.log("LIFF initialized successfully.");

        // 2. ตรวจสอบว่าล็อกอินหรือยัง
        if (!liff.isLoggedIn()) {
            liff.login();
            return; // หยุดทำงานไปเลยถ้ายังไม่ล็อกอิน
        }

        // 3. เมื่อ LIFF พร้อมแล้ว "จึงค่อย" ติดตั้งการทำงานของปุ่มทั้งหมด
        setupAllEventListeners();

        // 4. และ "จึงค่อย" โหลดข้อมูลทั้งหมด
        await loadAllData();

    } catch (error) {
        console.error("Initialization failed:", error);
        alert("Initialization failed. Please check console for details.");
    }
}

// --- ฟังก์ชันสำหรับตั้งค่า Event Listener ทั้งหมด ---
function setupAllEventListeners() {
    // -- ปุ่มเลือก Role --
    const roleSelectionPage = document.getElementById('page-role-selection');
    const mainApp = document.getElementById('main-app');
    const clientButton = document.getElementById('client-button');

    clientButton.addEventListener('click', () => {
        roleSelectionPage.style.display = 'none';
        mainApp.style.display = 'block';
    });

    // -- แถบเมนู --
    const navButtons = document.querySelectorAll('.bottom-nav button');
    navButtons.forEach(button => {
        button.addEventListener('click', () => navigateTo(button.dataset.page));
    });

    // -- ปุ่มอื่นๆ --
    document.getElementById('back-to-chat-list').addEventListener('click', () => navigateTo('page-chat'));
    document.getElementById('search-box').addEventListener('input', filterFreelancers);
    
    // -- Modal --
    const modal = document.getElementById('post-job-modal');
    document.getElementById('show-post-job-modal-button').addEventListener('click', () => modal.classList.add('visible'));
    document.getElementById('close-modal-button').addEventListener('click', () => modal.classList.remove('visible'));
    modal.addEventListener('click', (event) => {
        if (event.target === modal) modal.classList.remove('visible');
    });
    document.getElementById('post-job-form').addEventListener('submit', handleJobPost);
    
    console.log("All event listeners have been set up.");
}

// --- ฟังก์ชันสำหรับโหลดข้อมูลทั้งหมด ---
async function loadAllData() {
    await Promise.all([
        getUserProfile(),
        fetchFreelancers()
    ]);
    console.log("All data has been loaded.");
}


function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    document.querySelectorAll('.bottom-nav button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === pageId);
    });
    document.querySelector('.bottom-nav').style.display = pageId === 'page-chat-room' ? 'none' : 'flex';
}

async function getUserProfile() {
    try {
        currentUserProfile = await liff.getProfile();
        document.getElementById('pictureUrl').src = currentUserProfile.pictureUrl;
        document.getElementById('userId').innerHTML = `<b>User ID:</b> ${currentUserProfile.userId}`;
        document.getElementById('displayName').innerText = currentUserProfile.displayName;
        document.getElementById('statusMessage').innerHTML = `<b>Status:</b> ${currentUserProfile.statusMessage || 'ไม่มีข้อความสถานะ'}`;

        if (liff.getDecodedIDToken()) {
            document.getElementById('email').innerHTML = `<b>Email:</b> ${liff.getDecodedIDToken().email}`;
        }
    } catch(err) {
        console.error("Error getting profile:", err);
    }
}

async function fetchFreelancers() {
    try {
        const database = firebase.database();
        const snapshot = await database.ref('freelancers').once('value');
        const freelancersData = snapshot.val();
        allFreelancers = Object.values(freelancersData || {});
        displayFreelancers(allFreelancers);
        displayChats();
        await fetchMyJobs(); // โหลดงานของฉันหลังจากดึงข้อมูลฟรีแลนซ์แล้ว
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

async function handleJobPost(event) {
    event.preventDefault();
    if (!currentUserProfile) {
        alert("Cannot get user profile. Please try again.");
        return;
    }

    const jobData = {
        clientId: currentUserProfile.userId,
        clientName: currentUserProfile.displayName,
        clientPicture: currentUserProfile.pictureUrl,
        title: document.getElementById('job-title').value,
        description: document.getElementById('job-description').value,
        category: document.getElementById('job-category').value,
        budget: parseInt(document.getElementById('job-budget').value, 10),
        postDate: new Date().toISOString().split('T')[0]
    };

    try {
        const database = firebase.database();
        await database.ref('jobs').push(jobData);
        alert("Job posted successfully!");
        document.getElementById('post-job-form').reset();
        document.getElementById('post-job-modal').classList.remove('visible');
        await fetchMyJobs();
    } catch (error) {
        console.error("Error posting job:", error);
        alert("Failed to post job. Please try again.");
    }
}

async function fetchMyJobs() {
    if (!currentUserProfile) return;
    try {
        const database = firebase.database();
        const jobsRef = database.ref('jobs');
        const snapshot = await jobsRef.orderByChild('clientId').equalTo(currentUserProfile.userId).once('value');
        const jobsData = snapshot.val();
        const myJobs = Object.values(jobsData || {});
        displayMyJobs(myJobs);
    } catch (error) {
        console.error("Error fetching my jobs:", error);
    }
}

function displayMyJobs(jobs) {
    const listElement = document.getElementById('my-jobs-list');
    listElement.innerHTML = '';
    if (jobs.length === 0) {
        listElement.innerHTML = "<p>You haven't posted any jobs yet.</p>";
        return;
    }
    jobs.reverse().forEach(job => {
        const card = document.createElement('div');
        card.className = 'job-card';
        card.innerHTML = `
            <div class="job-card-header">
                <h3>${job.title}</h3>
                <span>Budget: ${job.budget} THB</span>
            </div>
            <p class="job-card-category">${job.category}</p>
            <p class="job-card-description">${job.description}</p>
            <div class="job-card-footer">
                Posted on ${job.postDate}
            </div>
        `;
        listElement.appendChild(card);
    });
}
