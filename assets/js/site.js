// ========== КОНФИГУРАЦИЯ ==========
const CONFIG = {
    API_GAMES: 'https://games.roblox.com/v1/games?universeIds=',
    API_THUMBNAILS: 'https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=',
    API_GROUPS: 'https://groups.roblox.com/v1/groups/',
    CACHE_DURATION: 300000 // 5 минут
};

// БАЗА ДАННЫХ ИГР (единственное, что нужно заполнить)
const GAMES_DB = [
    {
        id: '71240146627158',
        universeId: '9678437015',
        name: 'HD-Admin-Chaos-Tower',
        displayName: 'HD Admin Chaos Tower',
        owner: 'Tower Obby Productions',
        ownerId: '4828786884',
        added: '2024-01-15'
    }
];

const COMMUNITIES_DB = [
    {
        id: '102552180',
        name: 'Tower-Obby-Productions',
        displayName: 'Tower Obby Productions',
        ownerId: '4828786884'
    }
];

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing...');
    
    // Инициализация
    initTheme();
    initLanguage();
    
    // Определяем текущую страницу
    const path = window.location.pathname;
    console.log('Current path:', path);
    
    if (path.includes('/home/') || path === '/tracking/' || path === '/tracking/home/') {
        loadHomePage();
    } else if (path.includes('/games/') && !path.includes('template.html')) {
        const gameId = extractGameIdFromUrl(path);
        if (gameId) {
            loadGamePage(gameId);
        }
    } else if (path.includes('/communities/')) {
        const communityId = extractCommunityIdFromUrl(path);
        if (communityId) {
            loadCommunityPage(communityId);
        }
    }
    
    setupEventListeners();
    updateFooterYear();
});

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function extractGameIdFromUrl(path) {
    const match = path.match(/\/games\/(\d+)\//);
    return match ? match[1] : null;
}

function extractCommunityIdFromUrl(path) {
    const match = path.match(/\/communities\/(\d+)\//);
    return match ? match[1] : null;
}

// ========== ТЕМА ==========
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.documentElement.classList.remove('dark');
    } else {
        document.documentElement.classList.add('dark');
    }
    updateThemeButton();
}

function toggleTheme() {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    } else {
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
    window.currentLang = savedLang;
    updateLanguageButton();
}

function toggleLanguage() {
    window.currentLang = window.currentLang === 'en' ? 'ru' : 'en';
    localStorage.setItem('language', window.currentLang);
    updateLanguageButton();
    updateUITexts();
}

function updateLanguageButton() {
    const btn = document.getElementById('langToggle');
    if (btn) {
        btn.textContent = window.currentLang === 'en' ? 'RU' : 'EN';
    }
}

// ========== ЗАГРУЗКА ГЛАВНОЙ ==========
async function loadHomePage() {
    console.log('Loading home page...');
    
    try {
        // Загружаем данные для всех игр
        const gamesWithStats = await Promise.all(
            GAMES_DB.map(async (game) => {
                try {
                    const response = await fetch(`${CONFIG.API_GAMES}${game.universeId}`);
                    const data = await response.json();
                    return { ...game, stats: data.data?.[0] || {} };
                } catch (error) {
                    console.error(`Error loading game ${game.id}:`, error);
                    return { ...game, stats: {} };
                }
            })
        );
        
        console.log('Loaded games:', gamesWithStats);
        
        // Обновляем UI
        updateStatsCounters(gamesWithStats);
        renderGamesGrid(gamesWithStats);
        renderCommunitiesGrid();
        renderRecentGames(gamesWithStats);
        
    } catch (error) {
        console.error('Error loading home page:', error);
    }
}

function renderGamesGrid(games) {
    const grid = document.getElementById('gamesGrid');
    if (!grid) return;
    
    if (games.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-12 text-gray-500">No games found</div>';
        return;
    }
    
    const sorted = [...games].sort((a, b) => (b.stats?.playing || 0) - (a.stats?.playing || 0));
    
    grid.innerHTML = sorted.map(game => `
        <a href="/tracking/games/${game.id}/${game.name}/" 
           class="block bg-gray-100 dark:bg-roblox-dark-secondary rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
            <div class="relative pb-[56.25%] bg-gray-800">
                <img src="https://tr.rbxcdn.com/180DAY-ac99810b043fcc8b90d47a062764b279/768/432/Image/Webp/noFilter" 
                     alt="${game.displayName}"
                     class="absolute inset-0 w-full h-full object-cover"
                     loading="lazy">
                <div class="absolute top-2 right-2 bg-black/80 text-white px-2 py-1 rounded-full text-sm font-semibold">
                    🔴 ${formatNumber(game.stats?.playing || 0)}
                </div>
            </div>
            <div class="p-4">
                <h3 class="font-bold text-lg mb-1 truncate">${game.displayName}</h3>
                <div class="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>👁 ${formatNumber(game.stats?.visits || 0)}</span>
                    <span>❤️ ${formatNumber(game.stats?.favoritedCount || 0)}</span>
                </div>
            </div>
        </a>
    `).join('');
}

function renderCommunitiesGrid() {
    const grid = document.getElementById('communitiesGrid');
    if (!grid) return;
    
    if (COMMUNITIES_DB.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-12 text-gray-500">No communities found</div>';
        return;
    }
    
    grid.innerHTML = COMMUNITIES_DB.map(community => `
        <a href="/tracking/communities/${community.id}/${community.name}/" 
           class="block bg-gray-100 dark:bg-roblox-dark-secondary rounded-xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
            <div class="flex items-center gap-4">
                <div class="w-16 h-16 bg-gradient-to-br from-roblox-blue to-purple-500 rounded-xl flex items-center justify-center text-white text-2xl font-bold">
                    ${community.displayName.charAt(0)}
                </div>
                <div>
                    <h3 class="font-bold text-lg">${community.displayName}</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Click to view →</p>
                </div>
            </div>
        </a>
    `).join('');
}

function renderRecentGames(games) {
    const container = document.getElementById('recentGames');
    if (!container) return;
    
    const recent = games.slice(0, 4);
    
    container.innerHTML = recent.map(game => `
        <a href="/tracking/games/${game.id}/${game.name}/" 
           class="block bg-gray-100 dark:bg-roblox-dark-secondary rounded-lg p-4 hover:bg-gray-200 dark:hover:bg-gray-800 transition">
            <div class="font-semibold truncate">${game.displayName}</div>
            <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                🔴 ${formatNumber(game.stats?.playing || 0)} players
            </div>
        </a>
    `).join('');
}

function updateStatsCounters(games) {
    const totalGames = document.getElementById('totalGames');
    const totalCommunities = document.getElementById('totalCommunities');
    const totalPlayers = document.getElementById('totalPlayers');
    const totalVisits = document.getElementById('totalVisits');
    
    if (totalGames) totalGames.textContent = games.length;
    if (totalCommunities) totalCommunities.textContent = COMMUNITIES_DB.length;
    
    const activePlayers = games.reduce((sum, g) => sum + (g.stats?.playing || 0), 0);
    const allVisits = games.reduce((sum, g) => sum + (g.stats?.visits || 0), 0);
    
    if (totalPlayers) totalPlayers.textContent = formatNumber(activePlayers);
    if (totalVisits) totalVisits.textContent = formatNumber(allVisits);
}

// ========== ЗАГРУЗКА СТРАНИЦЫ ИГРЫ ==========
async function loadGamePage(gameId) {
    console.log('Loading game page for ID:', gameId);
    
    const game = GAMES_DB.find(g => g.id === gameId);
    if (!game) {
        window.location.href = '/tracking/404.html';
        return;
    }
    
    try {
        // Загружаем данные
        const response = await fetch(`${CONFIG.API_GAMES}${game.universeId}`);
        const data = await response.json();
        const stats = data.data?.[0] || {};
        
        console.log('Game stats:', stats);
        
        // Обновляем UI
        updateGameUI(game, stats);
        
    } catch (error) {
        console.error('Error loading game:', error);
        updateGameUI(game, {});
    }
}

function updateGameUI(game, stats) {
    // Заголовок
    document.title = `${stats.name || game.displayName} - GameTracker`;
    
    const titleEl = document.getElementById('gameTitle');
    if (titleEl) titleEl.textContent = stats.name || game.displayName;
    
    const currentNameEl = document.getElementById('currentGameName');
    if (currentNameEl) currentNameEl.textContent = stats.name || game.displayName;
    
    // Описание
    const descEl = document.getElementById('gameDescription');
    if (descEl) descEl.textContent = stats.description || 'No description available.';
    
    // Статистика
    const activeEl = document.getElementById('activePlayers');
    if (activeEl) activeEl.textContent = formatNumber(stats.playing || 0);
    
    const favEl = document.getElementById('favorites');
    if (favEl) favEl.textContent = formatNumber(stats.favoritedCount || 0);
    
    const visitsEl = document.getElementById('visits');
    if (visitsEl) visitsEl.textContent = formatNumber(stats.visits || 0);
    
    const serverEl = document.getElementById('serverSize');
    if (serverEl) serverEl.textContent = stats.maxPlayers || '38';
    
    // Даты
    const createdEl = document.getElementById('created');
    if (createdEl) createdEl.textContent = formatDate(stats.created);
    
    const updatedEl = document.getElementById('updated');
    if (updatedEl) updatedEl.textContent = formatDate(stats.updated);
    
    // Жанры
    const genreEl = document.getElementById('genre');
    if (genreEl) genreEl.textContent = stats.genre || 'Obby & Platformer';
    
    const subgenreEl = document.getElementById('subgenre');
    if (subgenreEl) subgenreEl.textContent = stats.subGenre || 'Tower Obby';
    
    // Ссылки
    const playLink = document.getElementById('playLink');
    if (playLink) playLink.href = `https://www.roblox.com/games/${game.id}/`;
    
    const ownerLink = document.getElementById('ownerLink');
    if (ownerLink) {
        ownerLink.textContent = game.owner;
        ownerLink.href = `https://www.roblox.com/users/${game.ownerId}/profile`;
    }
    
    // Слайдер
    renderSlider();
}

// ========== ЗАГРУЗКА СООБЩЕСТВА ==========
async function loadCommunityPage(communityId) {
    console.log('Loading community page for ID:', communityId);
    
    const community = COMMUNITIES_DB.find(c => c.id === communityId);
    if (!community) {
        window.location.href = '/tracking/404.html';
        return;
    }
    
    try {
        // Загружаем данные группы
        const response = await fetch(`${CONFIG.API_GROUPS}${communityId}`);
        const groupData = await response.json();
        
        // Находим игры сообщества
        const communityGames = GAMES_DB.filter(g => g.ownerId === community.ownerId);
        
        updateCommunityUI(community, groupData, communityGames);
        
    } catch (error) {
        console.error('Error loading community:', error);
        updateCommunityUI(community, {}, GAMES_DB);
    }
}

function updateCommunityUI(community, groupData, games) {
    document.getElementById('communityName').textContent = community.displayName;
    document.getElementById('communityTitle').textContent = community.displayName;
    document.title = `${community.displayName} - GameTracker`;
    
    const members = groupData.memberCount || 65000;
    document.getElementById('membersCount').textContent = formatNumber(members);
    document.getElementById('totalMembers').textContent = formatNumber(members);
    document.getElementById('totalGamesCount').textContent = games.length;
    
    document.getElementById('communityAbout').textContent = groupData.description || 'No description provided.';
    document.getElementById('ownerLink').textContent = 'Kirill_Dev';
    document.getElementById('viewOnRoblox').href = `https://www.roblox.com/communities/${community.id}/`;
    
    renderCommunityGames(games);
}

function renderCommunityGames(games) {
    const grid = document.getElementById('gamesGrid');
    if (!grid) return;
    
    if (games.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-12 text-gray-500">No games found</div>';
        return;
    }
    
    grid.innerHTML = games.map(game => `
        <a href="/tracking/games/${game.id}/${game.name}/" 
           class="block bg-gray-100 dark:bg-roblox-dark-secondary rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all">
            <div class="relative pb-[56.25%]">
                <img src="https://tr.rbxcdn.com/180DAY-ac99810b043fcc8b90d47a062764b279/768/432/Image/Webp/noFilter" 
                     alt="${game.displayName}"
                     class="absolute inset-0 w-full h-full object-cover">
                <div class="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
                    🔴 ${formatNumber(0)}
                </div>
            </div>
            <div class="p-4">
                <h3 class="font-bold text-lg mb-1 truncate">${game.displayName}</h3>
                <div class="text-sm text-gray-600 dark:text-gray-400">
                    👁 ${formatNumber(0)}
                </div>
            </div>
        </a>
    `).join('');
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ==========
function renderSlider() {
    const wrapper = document.getElementById('sliderWrapper');
    if (!wrapper) return;
    
    const images = [
        'https://tr.rbxcdn.com/180DAY-ac99810b043fcc8b90d47a062764b279/768/432/Image/Webp/noFilter',
        'https://tr.rbxcdn.com/180DAY-0319103f58ead123c482d498a9ad2494/768/432/Image/Webp/noFilter',
        'https://tr.rbxcdn.com/180DAY-0ea63b43b51f872ed2a3f00272ab3285/768/432/Image/Webp/noFilter'
    ];
    
    wrapper.innerHTML = images.map(src => `
        <img src="${src}" alt="Screenshot" class="slider-image" loading="lazy">
    `).join('');
    
    wrapper.dataset.current = '0';
}

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

function setupEventListeners() {
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
    
    const langBtn = document.getElementById('langToggle');
    if (langBtn) langBtn.addEventListener('click', toggleLanguage);
}

function updateUITexts() {
    // Обновление текстов на странице
}

// Глобальные функции для слайдера
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
