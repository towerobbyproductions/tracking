// Конфигурация
const CONFIG = {
    CACHE_DURATION: 300000, // 5 минут
    API_BASE: 'https://games.roproxy.com/v1/games?universeIds=',
    GROUPS_API: 'https://groups.roproxy.com/v1/groups/',
    THUMBNAIL_API: 'https://thumbnails.roproxy.com/v1/games/multiget/thumbnails?universeIds='
};

// Состояние
let currentLang = localStorage.getItem('language') || 'en';
let gamesData = [];
let communitiesData = [];

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initLanguage();
    await loadGamesList();
    await loadCommunitiesList();
    setupEventListeners();
    updateFooterYear();
    
    // Загружаем данные в зависимости от страницы
    if (window.location.pathname.includes('/home/')) {
        await loadHomePageData();
    }
});

// ========== ТЕМА ==========
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
    } else {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
    }
    updateThemeButton();
}

function toggleTheme() {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        html.classList.add('light');
        localStorage.setItem('theme', 'light');
    } else {
        html.classList.remove('light');
        html.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }
    updateThemeButton();
}

function updateThemeButton() {
    const btn = document.getElementById('themeToggle');
    if (btn) {
        btn.textContent = document.documentElement.classList.contains('dark') ? '🌙' : '☀️';
    }
}

// ========== ЯЗЫК ==========
function initLanguage() {
    const savedLang = localStorage.getItem('language') || 'en';
    currentLang = savedLang;
    updateLanguageButton();
}

function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'ru' : 'en';
    localStorage.setItem('language', currentLang);
    updateLanguageButton();
    updateUITexts();
}

function updateLanguageButton() {
    const btn = document.getElementById('langToggle');
    if (btn) {
        btn.textContent = currentLang === 'en' ? 'RU' : 'EN';
    }
}

// ========== ЗАГРУЗКА ДАННЫХ ==========
async function loadGamesList() {
    try {
        const response = await fetch('/tracking/data/games.json');
        const data = await response.json();
        gamesData = data.games || [];
    } catch (error) {
        console.error('Error loading games list:', error);
        gamesData = [];
    }
}

async function loadCommunitiesList() {
    try {
        const response = await fetch('/tracking/data/communities.json');
        const data = await response.json();
        communitiesData = data.communities || [];
    } catch (error) {
        console.error('Error loading communities list:', error);
        communitiesData = [];
    }
}

// ========== ЗАГРУЗКА ДАННЫХ ДЛЯ ГЛАВНОЙ ==========
async function loadHomePageData() {
    await Promise.all([
        loadGamesStats(),
        loadCommunitiesStats()
    ]);
    
    // Обновляем счетчики
    updateStatsCounters();
}

async function loadGamesStats() {
    const gamesGrid = document.getElementById('gamesGrid');
    if (!gamesGrid) return;
    
    gamesGrid.innerHTML = '<div class="col-span-full text-center py-12">Loading games...</div>';
    
    const gamePromises = gamesData.map(async (game) => {
        try {
            const response = await fetch(`${CONFIG.API_BASE}${game.universeId}`);
            const data = await response.json();
            const stats = data.data?.[0] || {};
            
            return {
                ...game,
                stats,
                playing: stats.playing || 0,
                visits: stats.visits || 0,
                favorites: stats.favoritedCount || 0
            };
        } catch (error) {
            console.error(`Error loading game ${game.id}:`, error);
            return game;
        }
    });
    
    const gamesWithStats = await Promise.all(gamePromises);
    
    // Сортируем и отображаем
    renderGamesGrid(gamesWithStats);
}

function renderGamesGrid(games) {
    const gamesGrid = document.getElementById('gamesGrid');
    if (!gamesGrid) return;
    
    const sorted = [...games].sort((a, b) => (b.playing || 0) - (a.playing || 0));
    
    gamesGrid.innerHTML = sorted.map(game => `
        <a href="/tracking/games/${game.id}/${game.name.replace(/[^a-zA-Z0-9]/g, '-')}/" class="game-card bg-gray-100 dark:bg-roblox-dark-secondary rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all">
            <div class="relative pb-[56.25%] overflow-hidden">
                <img src="https://tr.rbxcdn.com/180DAY-${getThumbnailHash(game.id)}/768/432/Image/Webp/noFilter" 
                     alt="${game.name}"
                     class="absolute inset-0 w-full h-full object-cover"
                     loading="lazy"
                     onerror="this.src='https://via.placeholder.com/768x432?text=No+Image'">
                <div class="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
                    🔴 ${formatNumber(game.playing || 0)}
                </div>
            </div>
            <div class="p-4">
                <h3 class="font-bold text-lg mb-1 truncate">${game.name}</h3>
                <div class="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>👁 ${formatNumber(game.visits || 0)}</span>
                    <span>❤️ ${formatNumber(game.favorites || 0)}</span>
                </div>
            </div>
        </a>
    `).join('');
}

// ========== ЗАГРУЗКА ДАННЫХ ИГРЫ ==========
async function loadGameData(gameId) {
    const game = gamesData.find(g => g.id === gameId);
    if (!game) {
        window.location.href = '/tracking/404.html';
        return;
    }
    
    try {
        const response = await fetch(`${CONFIG.API_BASE}${game.universeId}`);
        const data = await response.json();
        const stats = data.data?.[0] || {};
        
        updateGameUI(game, stats);
        loadGameThumbnails(game.universeId);
        initActivityChart(stats);
        
    } catch (error) {
        console.error('Error loading game data:', error);
        showNotification('Failed to load game data', 'error');
    }
}

function updateGameUI(game, stats) {
    // Заголовок
    document.getElementById('gameTitle').textContent = stats.name || game.name;
    document.getElementById('currentGameName').textContent = stats.name || game.name;
    document.title = `${stats.name || game.name} - GameTracker`;
    
    // Описание
    document.getElementById('gameDescription').textContent = stats.description || 'No description available.';
    
    // Статистика
    document.getElementById('activePlayers').textContent = formatNumber(stats.playing || 0);
    document.getElementById('favorites').textContent = formatNumber(stats.favoritedCount || 0);
    document.getElementById('visits').textContent = formatNumber(stats.visits || 0);
    document.getElementById('serverSize').textContent = stats.maxPlayers || '38';
    
    // Даты
    document.getElementById('created').textContent = formatDate(stats.created);
    document.getElementById('updated').textContent = formatDate(stats.updated);
    
    // Жанры
    document.getElementById('genre').textContent = stats.genre || 'Obby & Platformer';
    document.getElementById('subgenre').textContent = stats.subGenre || 'Tower Obby';
    
    // Ссылки
    document.getElementById('playLink').href = `https://www.roblox.com/games/${game.id}/`;
    document.getElementById('ownerLink').textContent = game.owner;
    document.getElementById('ownerLink').href = `https://www.roblox.com/users/${game.ownerId}/profile`;
}

async function loadGameThumbnails(universeId) {
    try {
        const response = await fetch(`${CONFIG.THUMBNAIL_API}${universeId}`);
        const data = await response.json();
        const images = data.data?.[0]?.thumbnails || [];
        
        renderSlider(images.map(img => img.imageUrl));
    } catch (error) {
        console.error('Error loading thumbnails:', error);
        // Используем заглушки
        renderSlider([
            'https://tr.rbxcdn.com/180DAY-ac99810b043fcc8b90d47a062764b279/768/432/Image/Webp/noFilter',
            'https://tr.rbxcdn.com/180DAY-0319103f58ead123c482d498a9ad2494/768/432/Image/Webp/noFilter',
            'https://tr.rbxcdn.com/180DAY-0ea63b43b51f872ed2a3f00272ab3285/768/432/Image/Webp/noFilter'
        ]);
    }
}

// ========== ЗАГРУЗКА ДАННЫХ СООБЩЕСТВА ==========
async function loadCommunityData(communityId) {
    const community = communitiesData.find(c => c.id === communityId);
    if (!community) {
        window.location.href = '/tracking/404.html';
        return;
    }
    
    try {
        // Загружаем данные группы
        const groupResponse = await fetch(`${CONFIG.GROUPS_API}${communityId}`);
        const groupData = await groupResponse.json();
        
        // Загружаем игры сообщества
        const gamesInCommunity = gamesData.filter(g => g.ownerId === community.ownerId);
        
        updateCommunityUI(community, groupData);
        await loadCommunityGames(gamesInCommunity);
        
    } catch (error) {
        console.error('Error loading community data:', error);
        showNotification('Failed to load community data', 'error');
    }
}

function updateCommunityUI(community, groupData) {
    document.getElementById('communityName').textContent = community.name;
    document.getElementById('communityTitle').textContent = community.name;
    document.getElementById('membersCount').textContent = formatNumber(groupData.memberCount || 65000);
    document.getElementById('totalMembers').textContent = formatNumber(groupData.memberCount || 65000);
    document.getElementById('communityAbout').textContent = groupData.description || 'No description provided.';
    document.getElementById('ownerLink').textContent = 'Kirill_Dev';
    document.getElementById('viewOnRoblox').href = `https://www.roblox.com/communities/${communityId}/`;
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function formatNumber(num) {
    if (!num && num !== 0) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
        return 'N/A';
    }
}

function updateFooterYear() {
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Хэш для заглушек (упрощенно)
function getThumbnailHash(id) {
    const hashes = [
        'ac99810b043fcc8b90d47a062764b279',
        '0319103f58ead123c482d498a9ad2494',
        '0ea63b43b51f872ed2a3f00272ab3285'
    ];
    return hashes[parseInt(id.slice(-1)) % hashes.length];
}

// ========== СОБЫТИЯ ==========
function setupEventListeners() {
    // Theme toggle
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
    
    // Language toggle
    const langBtn = document.getElementById('langToggle');
    if (langBtn) langBtn.addEventListener('click', toggleLanguage);
    
    // Sort buttons
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.sort-btn').forEach(b => 
                b.classList.remove('active', 'bg-roblox-blue', 'text-white'));
            btn.classList.add('active', 'bg-roblox-blue', 'text-white');
            
            const sortBy = btn.dataset.sort;
            sortGames(sortBy);
        });
    });
}

// Экспорт для глобального доступа
window.changeSlide = function(direction) {
    const wrapper = document.getElementById('sliderWrapper');
    if (!wrapper) return;
    
    const totalSlides = wrapper.children.length;
    if (totalSlides === 0) return;
    
    let currentSlide = parseInt(wrapper.dataset.current || 0);
    currentSlide = (currentSlide + direction + totalSlides) % totalSlides;
    wrapper.dataset.current = currentSlide;
    wrapper.style.transform = `translateX(-${currentSlide * 100}%)`;
};

window.loadGameData = loadGameData;
window.loadCommunityData = loadCommunityData;
