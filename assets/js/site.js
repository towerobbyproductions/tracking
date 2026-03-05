// tracking/assets/js/site.js - ПОЛНОСТЬЮ ПЕРЕПИСАННЫЙ КОД

const CONFIG = {
    PROXY_URL: 'https://cors-anywhere.herokuapp.com/', // или свой прокси
    API_GAMES: 'https://games.roblox.com/v1/games?universeIds=',
    API_THUMBNAILS: 'https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=',
    API_GROUPS: 'https://groups.roblox.com/v1/groups/',
    CACHE_DURATION: 300000 // 5 минут
};

// База данных игр (единственное, что нужно редактировать вручную)
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

// Состояние приложения
let currentLang = localStorage.getItem('language') || 'en';
let gamesData = new Map();

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    initLanguage();
    
    // Определяем текущую страницу по URL
    const path = window.location.pathname;
    
    if (path.includes('/home/')) {
        await loadHomePage();
    } else if (path.includes('/games/')) {
        await loadGamePage();
    } else if (path.includes('/communities/')) {
        await loadCommunityPage();
    }
    
    setupEventListeners();
    updateFooterYear();
});

// ========== ЗАГРУЗКА ГЛАВНОЙ ==========
async function loadHomePage() {
    showLoading();
    
    try {
        // Загружаем данные для всех игр параллельно через прокси
        const gamePromises = GAMES_DB.map(game => 
            fetch(`${CONFIG.PROXY_URL}${CONFIG.API_GAMES}${game.universeId}`)
                .then(res => res.json())
                .then(data => ({ ...game, stats: data.data?.[0] || {} }))
                .catch(() => ({ ...game, stats: {} }))
        );
        
        const gamesWithStats = await Promise.all(gamePromises);
        
        // Сохраняем в Map для быстрого доступа
        gamesWithStats.forEach(game => gamesData.set(game.id, game));
        
        // Обновляем UI
        updateStatsCounters(gamesWithStats);
        renderGamesGrid(gamesWithStats);
        renderCommunitiesGrid();
        renderRecentGames(gamesWithStats);
        
    } catch (error) {
        console.error('Error loading home page:', error);
        showNotification('Failed to load data', 'error');
    }
    
    hideLoading();
}

// ========== ЗАГРУЗКА СТРАНИЦЫ ИГРЫ ==========
async function loadGamePage() {
    // Получаем ID игры из URL: /tracking/games/71240146627158/HD-Admin-Chaos-Tower/
    const pathParts = window.location.pathname.split('/');
    const gameId = pathParts[pathParts.indexOf('games') + 1];
    
    const game = GAMES_DB.find(g => g.id === gameId);
    if (!game) {
        window.location.href = '/tracking/404.html';
        return;
    }
    
    showLoading();
    
    try {
        // Загружаем данные через прокси
        const [statsRes, thumbRes] = await Promise.all([
            fetch(`${CONFIG.PROXY_URL}${CONFIG.API_GAMES}${game.universeId}`),
            fetch(`${CONFIG.PROXY_URL}${CONFIG.API_THUMBNAILS}${game.universeId}&size=768x432&format=Png`)
        ]);
        
        const statsData = await statsRes.json();
        const thumbData = await thumbRes.json();
        
        const stats = statsData.data?.[0] || {};
        const thumbnails = thumbData.data?.[0]?.thumbnails || [];
        
        updateGameUI(game, stats, thumbnails);
        
    } catch (error) {
        console.error('Error loading game page:', error);
        showNotification('Failed to load game data', 'error');
        // Показываем заглушки
        updateGameUI(game, {}, []);
    }
    
    hideLoading();
}

// ========== ЗАГРУЗКА СТРАНИЦЫ СООБЩЕСТВА ==========
async function loadCommunityPage() {
    const pathParts = window.location.pathname.split('/');
    const communityId = pathParts[pathParts.indexOf('communities') + 1];
    
    const community = COMMUNITIES_DB.find(c => c.id === communityId);
    if (!community) {
        window.location.href = '/tracking/404.html';
        return;
    }
    
    showLoading();
    
    try {
        // Загружаем данные группы через прокси
        const groupRes = await fetch(`${CONFIG.PROXY_URL}${CONFIG.API_GROUPS}${communityId}`);
        const groupData = await groupRes.json();
        
        // Находим игры этого сообщества
        const communityGames = GAMES_DB.filter(g => g.ownerId === community.ownerId);
        
        // Загружаем статистику для игр
        const gamesWithStats = await Promise.all(
            communityGames.map(async game => {
                try {
                    const res = await fetch(`${CONFIG.PROXY_URL}${CONFIG.API_GAMES}${game.universeId}`);
                    const data = await res.json();
                    return { ...game, stats: data.data?.[0] || {} };
                } catch {
                    return { ...game, stats: {} };
                }
            })
        );
        
        updateCommunityUI(community, groupData, gamesWithStats);
        
    } catch (error) {
        console.error('Error loading community page:', error);
        showNotification('Failed to load community data', 'error');
    }
    
    hideLoading();
}

// ========== ОТОБРАЖЕНИЕ ИГР НА ГЛАВНОЙ ==========
function renderGamesGrid(games) {
    const grid = document.getElementById('gamesGrid');
    if (!grid) return;
    
    // Сортируем по активным игрокам
    const sorted = [...games].sort((a, b) => (b.stats?.playing || 0) - (a.stats?.playing || 0));
    
    grid.innerHTML = sorted.map(game => `
        <a href="/tracking/games/${game.id}/${game.name}/" 
           class="game-card bg-gray-100 dark:bg-roblox-dark-secondary rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
            <div class="relative pb-[56.25%] bg-gray-800">
                <img src="https://tr.rbxcdn.com/180DAY-${getThumbnailHash(game.id)}/768/432/Image/Webp/noFilter" 
                     alt="${game.displayName}"
                     class="absolute inset-0 w-full h-full object-cover"
                     loading="lazy"
                     onerror="this.src='https://via.placeholder.com/768x432?text=No+Image'">
                <div class="absolute top-2 right-2 bg-black/80 text-white px-2 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                    <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    ${formatNumber(game.stats?.playing || 0)}
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
    
    grid.innerHTML = COMMUNITIES_DB.map(community => `
        <a href="/tracking/communities/${community.id}/${community.name}/" 
           class="community-card bg-gray-100 dark:bg-roblox-dark-secondary rounded-xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-105">
            <div class="flex items-center gap-4">
                <div class="w-16 h-16 bg-gradient-to-br from-roblox-blue to-purple-500 rounded-xl flex items-center justify-center text-white text-2xl font-bold">
                    ${community.displayName.charAt(0)}
                </div>
                <div>
                    <h3 class="font-bold text-lg">${community.displayName}</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Click to view games →</p>
                </div>
            </div>
        </a>
    `).join('');
}

function renderRecentGames(games) {
    const container = document.getElementById('recentGames');
    if (!container) return;
    
    // Показываем последние добавленные
    const recent = [...games].sort((a, b) => new Date(b.added) - new Date(a.added)).slice(0, 4);
    
    container.innerHTML = recent.map(game => `
        <a href="/tracking/games/${game.id}/${game.name}/" 
           class="bg-gray-100 dark:bg-roblox-dark-secondary rounded-lg p-4 hover:bg-gray-200 dark:hover:bg-gray-800 transition">
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
    
    // Обновляем футер
    document.getElementById('footerGames').textContent = games.length;
    document.getElementById('footerCommunities').textContent = COMMUNITIES_DB.length;
    document.getElementById('footerPlayers').textContent = formatNumber(activePlayers);
}

// ========== ОТОБРАЖЕНИЕ СТРАНИЦЫ ИГРЫ ==========
function updateGameUI(game, stats, thumbnails = []) {
    // Заголовок
    document.title = `${stats.name || game.displayName} - GameTracker`;
    document.getElementById('gameTitle').textContent = stats.name || game.displayName;
    document.getElementById('currentGameName').textContent = stats.name || game.displayName;
    
    // Описание
    document.getElementById('gameDescription').textContent = stats.description || 'No description available.';
    
    // Статистика
    document.getElementById('activePlayers').textContent = formatNumber(stats.playing || 0);
    document.getElementById('favorites').textContent = formatNumber(stats.favoritedCount || 0);
    document.getElementById('visits').textContent = formatNumber(stats.visits || 0);
    document.getElementById('serverSize').textContent = stats.maxPlayers || '38';
    document.getElementById('peakPlayers').textContent = formatNumber(Math.round((stats.visits || 0) * 0.1)); // Примерно
    document.getElementById('dailyVisits').textContent = formatNumber(Math.round((stats.visits || 0) / 30));
    document.getElementById('rating').textContent = `${Math.min(99, Math.round((stats.favoritedCount || 0) / ((stats.visits || 1) / 1000)))}%`;
    
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
    
    // Слайдер
    renderSlider(thumbnails.length ? thumbnails.map(t => t.imageUrl) : getDefaultThumbnails());
    
    // График
    initActivityChart(stats);
}

// ========== ОТОБРАЖЕНИЕ СТРАНИЦЫ СООБЩЕСТВА ==========
function updateCommunityUI(community, groupData, games) {
    document.getElementById('communityName').textContent = community.displayName;
    document.getElementById('communityTitle').textContent = community.displayName;
    document.title = `${community.displayName} - GameTracker`;
    
    const members = groupData.memberCount || 65000;
    document.getElementById('membersCount').textContent = formatNumber(members);
    document.getElementById('totalMembers').textContent = formatNumber(members);
    document.getElementById('totalGamesCount').textContent = games.length;
    
    const totalVisits = games.reduce((sum, g) => sum + (g.stats?.visits || 0), 0);
    document.getElementById('totalVisits').textContent = formatNumber(totalVisits);
    
    document.getElementById('communityAbout').textContent = groupData.description || 'No description provided.';
    document.getElementById('ownerLink').textContent = 'Kirill_Dev';
    document.getElementById('viewOnRoblox').href = `https://www.roblox.com/communities/${community.id}/`;
    
    // Отображаем игры сообщества
    renderCommunityGames(games);
}

function renderCommunityGames(games) {
    const grid = document.getElementById('gamesGrid');
    if (!grid) return;
    
    grid.innerHTML = games.map(game => `
        <a href="/tracking/games/${game.id}/${game.name}/" 
           class="game-card bg-gray-100 dark:bg-roblox-dark-secondary rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all">
            <div class="relative pb-[56.25%]">
                <img src="https://tr.rbxcdn.com/180DAY-${getThumbnailHash(game.id)}/768/432/Image/Webp/noFilter" 
                     alt="${game.displayName}"
                     class="absolute inset-0 w-full h-full object-cover">
                <div class="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
                    🔴 ${formatNumber(game.stats?.playing || 0)}
                </div>
            </div>
            <div class="p-4">
                <h3 class="font-bold text-lg mb-1 truncate">${game.displayName}</h3>
                <div class="text-sm text-gray-600 dark:text-gray-400">
                    👁 ${formatNumber(game.stats?.visits || 0)}
                </div>
            </div>
        </a>
    `).join('');
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ==========
function renderSlider(images) {
    const wrapper = document.getElementById('sliderWrapper');
    if (!wrapper) return;
    
    wrapper.innerHTML = images.map((src, i) => `
        <img src="${src}" 
             alt="Screenshot ${i + 1}" 
             class="slider-image"
             loading="lazy">
    `).join('');
    
    wrapper.dataset.current = '0';
}

function getDefaultThumbnails() {
    return [
        'https://tr.rbxcdn.com/180DAY-ac99810b043fcc8b90d47a062764b279/768/432/Image/Webp/noFilter',
        'https://tr.rbxcdn.com/180DAY-0319103f58ead123c482d498a9ad2494/768/432/Image/Webp/noFilter',
        'https://tr.rbxcdn.com/180DAY-0ea63b43b51f872ed2a3f00272ab3285/768/432/Image/Webp/noFilter'
    ];
}

function getThumbnailHash(id) {
    const hashes = [
        'ac99810b043fcc8b90d47a062764b279',
        '0319103f58ead123c482d498a9ad2494',
        '0ea63b43b51f872ed2a3f00272ab3285'
    ];
    return hashes[parseInt(id.slice(-1)) % hashes.length];
}

function showLoading() {
    document.querySelectorAll('.stat-card, #gamesGrid, #communitiesGrid').forEach(el => {
        el.classList.add('opacity-50', 'pointer-events-none');
    });
}

function hideLoading() {
    document.querySelectorAll('.stat-card, #gamesGrid, #communitiesGrid').forEach(el => {
        el.classList.remove('opacity-50', 'pointer-events-none');
    });
}

// ========== НАСТРОЙКА РОУТИНГА ==========
// В tracking/games/[id]/[name]/index.html добавить:
/*
<script>
    // Этот файл не нужно создавать физически!
    // Вместо этого настройте сервер на редирект:
    // tracking/games/* -> tracking/games/template.html
    
    // ИЛИ используйте JavaScript роутинг:
    if (window.location.pathname.includes('/games/') && !window.location.pathname.endsWith('template.html')) {
        window.location.href = '/tracking/games/template.html' + window.location.search;
    }
</script>
*/
