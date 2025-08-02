// script.js (Frontend LIFF)

// !!! แก้เป็น URL ของ Google Sheet CSV ของคุณ !!!
const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSC4XVpRkYn5R9K3WEYbBLE68EBgdwWb93uTyT14kqE9VJi2ht1VdAee_R8_PfvZmk39CTxEfdmCDLp/pub?output=csv'; 
const liffId = "YOUR_LIFF_ID"; // เดี๋ยวเราจะได้ค่านี้ในขั้นตอนถัดไป

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
        const response = await fetch(SPREADSHEET_URL);
        const csvText = await response.text();

        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        allFreelancers = lines.slice(1).map(line => {
            const data = line.split(',').map(d => d.trim());
            let freelancer = {};
            headers.forEach((header, index) => {
                freelancer[header] = data[index];
            });
            return freelancer;
        });

        displayFreelancers(allFreelancers);

    } catch (error) {
        console.error('Failed to fetch freelancers', error);
        listElement.innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    }
}

function displayFreelancers(freelancers) {
    const listElement = document.getElementById('freelancer-list');
    listElement.innerHTML = ''; // Clear previous results

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
        f.name.toLowerCase().includes(searchTerm) || 
        f.skills.toLowerCase().includes(searchTerm)
    );
    displayFreelancers(filtered);
}
