/* TikTok Live Bar — Control Panel */

const USERNAME_KEY = 'tiktok-live-bar.control.username';

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
        });
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        document.getElementById('tab-' + btn.dataset.tab)?.classList.add('active');
        closeMobileNav();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});

const navToggle = document.getElementById('nav-toggle');
const tabNav = document.getElementById('tab-nav');
function closeMobileNav() {
    tabNav?.classList.remove('is-open');
    if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
}
navToggle?.addEventListener('click', () => {
    const open = tabNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(open));
});

const ui = {
    statusDot: document.getElementById('status-dot'),
    statusTitle: document.getElementById('status-title'),
    statusCardDot: document.getElementById('status-card-dot'),
    statusTitleCard: document.getElementById('status-title-card'),
    statusMessage: document.getElementById('status-message'),
    statusCardMeta: document.getElementById('status-card-meta'),
    metaUsername: document.getElementById('meta-username'),
    username: document.getElementById('username'),
    connect: document.getElementById('connect'),
    disconnect: document.getElementById('disconnect'),
    stopDemo: document.getElementById('stop-demo'),
    demoState: document.getElementById('demo-state'),
    reset: document.getElementById('reset'),
    userIndex: document.getElementById('user-index'),
    joinMode: document.getElementById('join-mode'),
    giftAlwaysJoins: document.getElementById('gift-always-joins'),
    masterRules: document.getElementById('master-rules'),
    masterRuleTemplate: document.getElementById('master-rule-template'),
    addMasterRule: document.getElementById('add-master-rule'),
    saveMaster: document.getElementById('save-master'),
    saveMasterSticky: document.getElementById('save-master-sticky'),
    masterMessage: document.getElementById('master-message'),
    recentGifts: document.getElementById('recent-gifts'),
    ruleCount: document.getElementById('rule-count'),
    toastHost: document.getElementById('toast-host'),
    metrics: {
        events: document.getElementById('metric-events'),
        members: document.getElementById('metric-members'),
        chats: document.getElementById('metric-chats'),
        gifts: document.getElementById('metric-gifts'),
        diamonds: document.getElementById('metric-diamonds'),
        likes: document.getElementById('metric-likes'),
    },
    quick: {
        events: document.getElementById('quick-events'),
        gifts: document.getElementById('quick-gifts'),
        diamonds: document.getElementById('quick-diamonds'),
        members: document.getElementById('quick-members'),
    },
};

let socket;
let reconnectTimer;
let masterConfig = { joinMode: 'keyword_only', giftAlwaysJoins: true, rules: [] };
const recentGifts = new Map();
let activeUsername = '';

function toast(message, type = 'ok') {
    if (!ui.toastHost || !message) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    ui.toastHost.append(el);
    setTimeout(() => {
        el.classList.add('out');
        setTimeout(() => el.remove(), 220);
    }, 2800);
}

function normalizeUsername(value) {
    return String(value || '').trim().replace(/^@+/, '');
}

function send(message) {
    if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
        return true;
    }
    toast('Chưa kết nối máy chủ Node. Đang thử lại…', 'err');
    return false;
}

function setStatus(data) {
    const state = data.state || '';
    ui.statusDot.className = 'status-dot ' + state;
    if (ui.statusCardDot) ui.statusCardDot.className = 'status-card-dot ' + state;

    const names = {
        idle: '✅ Sẵn sàng',
        connecting: '⏳ Đang kết nối…',
        connected: '🔴 LIVE',
        demo: '🧪 DEMO',
        disconnected: '⚠️ Mất kết nối',
        ended: '⏹ Live kết thúc',
        error: '❌ Lỗi kết nối',
        reconnecting: '🔄 Đang kết nối lại…',
    };
    const label = names[state] || state;
    ui.statusTitle.textContent = label;
    if (ui.statusTitleCard) ui.statusTitleCard.textContent = label;
    if (ui.statusMessage) ui.statusMessage.textContent = data.message || '';
    ui.connect.disabled = state === 'connecting' || state === 'reconnecting';
    ui.connect.classList.toggle('is-busy', state === 'connecting' || state === 'reconnecting');

    const liveBadge = document.getElementById('live-badge');
    if (liveBadge) {
        liveBadge.classList.toggle('is-live', state === 'connected');
        liveBadge.classList.toggle('is-demo', state === 'demo');
    }

    if (ui.demoState) {
        const demoOn = state === 'demo';
        ui.demoState.textContent = demoOn ? 'Đang chạy' : 'Đang tắt';
        ui.demoState.classList.toggle('on', demoOn);
    }

    if (data.username) activeUsername = normalizeUsername(data.username);
    if (ui.statusCardMeta && ui.metaUsername) {
        const showUser = Boolean(activeUsername) && (state === 'connected' || state === 'connecting' || state === 'reconnecting' || state === 'demo');
        ui.statusCardMeta.hidden = !showUser;
        ui.metaUsername.textContent = showUser ? `@${activeUsername}` : '';
    }
}

function setMetrics(data) {
    for (const [key, el] of Object.entries(ui.metrics)) {
        if (el) el.textContent = Number(data[key] || 0).toLocaleString('vi-VN');
    }
    if (ui.quick.events) ui.quick.events.textContent = Number(data.events || 0).toLocaleString('vi-VN');
    if (ui.quick.gifts) ui.quick.gifts.textContent = Number(data.gifts || 0).toLocaleString('vi-VN');
    if (ui.quick.diamonds) ui.quick.diamonds.textContent = Number(data.diamonds || 0).toLocaleString('vi-VN');
    if (ui.quick.members) ui.quick.members.textContent = Number(data.members || 0).toLocaleString('vi-VN');
}

function makeRuleId() {
    return `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyRule(overrides = {}) {
    return {
        id: makeRuleId(), enabled: true, source: 'gift', trigger: '',
        giftId: '', match: 'exact', action: 'dance', displayDiamonds: 0,
        durationMs: 3000, label: '', variant: '', fireworkBursts: 0, ...overrides,
    };
}

function setMasterMessage(msg, error = false) {
    ui.masterMessage.textContent = msg || '';
    ui.masterMessage.classList.toggle('error', error);
    ui.masterMessage.classList.toggle('ok', Boolean(msg) && !error);
}

function updateRuleCount() {
    if (!ui.ruleCount) return;
    const count = ui.masterRules.querySelectorAll('.master-rule-row').length;
    ui.ruleCount.textContent = `${count} luật`;
}

function updateRuleSource(row) {
    const source = row.querySelector('[data-field="source"]').value;
    const giftId = row.querySelector('[data-field="giftId"]');
    giftId.disabled = source !== 'gift';
    giftId.placeholder = source === 'gift' ? 'ID (nếu có)' : 'Không dùng cho chat';
    row.dataset.src = source;
    const badge = row.querySelector('[data-src-label]');
    if (badge) {
        badge.textContent = source === 'gift' ? 'GIFT' : 'CHAT';
        badge.className = `src-badge ${source}`;
    }
}

function createRuleRow(rule) {
    const row = ui.masterRuleTemplate.content.firstElementChild.cloneNode(true);
    row.dataset.ruleId = rule.id || makeRuleId();
    for (const input of row.querySelectorAll('[data-field]')) {
        const field = input.dataset.field;
        if (field === 'durationSeconds') input.value = (Number(rule.durationMs) || 0) / 1000;
        else if (input.type === 'checkbox') input.checked = rule[field] !== false;
        else input.value = rule[field] ?? '';
    }
    row.querySelector('[data-field="source"]').addEventListener('change', () => updateRuleSource(row));
    row.querySelector('[data-command="delete"]').addEventListener('click', () => {
        row.remove();
        updateRuleCount();
        setMasterMessage('Đã xóa luật khỏi danh sách. Nhớ Lưu & áp dụng.');
    });
    row.querySelector('[data-command="test"]').addEventListener('click', () => {
        const config = readMasterFromUi();
        if (!send({ type: 'master_save', master: config })) return;
        send({ type: 'master_test', ruleId: row.dataset.ruleId, diamonds: 100 });
        setMasterMessage('Đang test luật trên Unity…');
        toast('Đang test luật trên game');
    });
    updateRuleSource(row);
    return row;
}

function renderMaster(config) {
    masterConfig = config || masterConfig;
    ui.joinMode.value = masterConfig.joinMode || 'keyword_only';
    ui.giftAlwaysJoins.checked = masterConfig.giftAlwaysJoins !== false;
    ui.masterRules.replaceChildren(...(masterConfig.rules || []).map(createRuleRow));
    updateRuleCount();
}

function readMasterFromUi() {
    const rules = [...ui.masterRules.querySelectorAll('.master-rule-row')].map(row => ({
        id: row.dataset.ruleId,
        enabled: row.querySelector('[data-field="enabled"]').checked,
        source: row.querySelector('[data-field="source"]').value,
        trigger: row.querySelector('[data-field="trigger"]').value.trim(),
        giftId: row.querySelector('[data-field="giftId"]').value.trim(),
        match: row.querySelector('[data-field="match"]').value,
        action: row.querySelector('[data-field="action"]').value,
        displayDiamonds: Number(row.querySelector('[data-field="displayDiamonds"]')?.value) || 0,
        durationMs: Math.round((Number(row.querySelector('[data-field="durationSeconds"]').value) || 0) * 1000),
        label: row.querySelector('[data-field="label"]').value.trim(),
        variant: row.querySelector('[data-field="variant"]').value,
        fireworkBursts: Number(row.querySelector('[data-field="fireworkBursts"]').value) || 0,
    }));
    return { joinMode: ui.joinMode.value, giftAlwaysJoins: ui.giftAlwaysJoins.checked, rules };
}

function observeGift(data) {
    const key = String(data.giftId || data.giftName || 'gift');
    recentGifts.set(key, data);
    while (recentGifts.size > 60) recentGifts.delete(recentGifts.keys().next().value);
    renderGiftCatalog();
}

function renderGiftCatalog() {
    if (recentGifts.size === 0) {
        ui.recentGifts.replaceChildren();
        const empty = document.createElement('span');
        empty.className = 'empty-state';
        empty.textContent = 'Chưa nhận gift thật nào. Khi live, gift sẽ tự lưu tại đây.';
        ui.recentGifts.append(empty);
        return;
    }

    ui.recentGifts.replaceChildren(
        ...[...recentGifts.values()].reverse().map(gift => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'gift-catalog-item';
            if (gift.giftPictureUrl) {
                const img = document.createElement('img');
                img.src = gift.giftPictureUrl;
                img.alt = '';
                img.loading = 'lazy';
                btn.append(img);
            }
            const span = document.createElement('span');
            span.textContent = `${gift.giftName || 'Gift'} · ID ${gift.giftId || '?'} · ${gift.diamondCount || 0}💎`;
            btn.append(span);
            btn.addEventListener('click', () => {
                ui.masterRules.append(createRuleRow(emptyRule({
                    source: 'gift',
                    trigger: gift.giftName || '',
                    giftId: String(gift.giftId || ''),
                    displayDiamonds: Number(gift.diamondCount) || 0,
                    action: 'dance',
                })));
                updateRuleCount();
                setMasterMessage('Đã thêm gift. Chọn hành động rồi Lưu & áp dụng.');
                toast('Đã thêm luật gift mới');
            });
            return btn;
        })
    );
}

function saveMaster() {
    if (!send({ type: 'master_save', master: readMasterFromUi() })) return;
    setMasterMessage('Đang lưu và áp dụng…');
}

function connectSocket() {
    clearTimeout(reconnectTimer);
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(`${protocol}//${location.host}`);

    socket.addEventListener('open', () => {
        send({ type: 'register', role: 'control' });
    });

    socket.addEventListener('message', event => {
        let data;
        try { data = JSON.parse(event.data); } catch { return; }
        if (data.type === 'status' || data.type === 'error') setStatus(data);
        if (data.type === 'metrics') setMetrics(data);
        if (data.type === 'master_config') renderMaster(data.master);
        if (data.type === 'master_saved') {
            setMasterMessage(data.message || 'Đã lưu Master.');
            toast(data.message || 'Đã lưu Master Rules');
        }
        if (data.type === 'gift_observed') observeGift(data);
        if (data.type === 'gift_catalog') {
            recentGifts.clear();
            for (const g of data.gifts || []) {
                recentGifts.set(String(g.giftId || g.giftName || 'gift'), g);
            }
            renderGiftCatalog();
        }
        if (data.type === 'error') {
            setMasterMessage(data.message || 'Có lỗi.', true);
            toast(data.message || 'Có lỗi xảy ra', 'err');
        }
    });

    socket.addEventListener('close', () => {
        setStatus({ state: 'disconnected', message: 'Đang kết nối lại máy chủ…' });
        reconnectTimer = setTimeout(connectSocket, 2000);
    });

    socket.addEventListener('error', () => socket.close());
}

function connectLive() {
    const username = normalizeUsername(ui.username.value);
    if (!username) {
        toast('Nhập username TikTok đang live', 'err');
        ui.username.focus();
        return;
    }
    ui.username.value = username;
    localStorage.setItem(USERNAME_KEY, username);
    activeUsername = username;
    if (send({ type: 'set_username', username })) {
        toast(`Đang kết nối @${username}`);
    }
}

ui.connect.addEventListener('click', connectLive);
ui.username.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        e.preventDefault();
        connectLive();
    }
});
ui.disconnect.addEventListener('click', () => {
    if (!confirm('Ngắt kết nối TikTok / TikFinity?')) return;
    if (send({ type: 'disconnect_tiktok' })) toast('Đã gửi lệnh ngắt kết nối');
});
ui.stopDemo.addEventListener('click', () => {
    if (send({ type: 'demo_stop' })) toast('Đã dừng demo');
});
ui.reset.addEventListener('click', () => {
    if (!confirm('Reset toàn bộ phiên game? Người chơi và thống kê sẽ bị xóa.')) return;
    if (send({ type: 'reset_game' })) toast('Đã reset game');
});
ui.addMasterRule.addEventListener('click', () => {
    ui.masterRules.append(createRuleRow(emptyRule()));
    updateRuleCount();
});
ui.saveMaster.addEventListener('click', saveMaster);
ui.saveMasterSticky?.addEventListener('click', saveMaster);

document.querySelectorAll('[data-demo-count]').forEach(btn => {
    btn.addEventListener('click', () => {
        if (send({ type: 'demo_start', count: Number(btn.dataset.demoCount) })) {
            toast(`Chạy demo ${btn.dataset.demoCount} người`);
        }
    });
});

document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
        if (send({
            type: 'demo_event',
            action: btn.dataset.action,
            value: Number(btn.dataset.value) || 1,
            giftName: btn.dataset.giftName || '',
            userIndex: Number(ui.userIndex.value) || 1,
        })) {
            btn.classList.add('is-busy');
            setTimeout(() => btn.classList.remove('is-busy'), 180);
        }
    });
});

const savedUsername = localStorage.getItem(USERNAME_KEY);
if (savedUsername) ui.username.value = normalizeUsername(savedUsername);

connectSocket();
