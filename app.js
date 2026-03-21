

var AI_PROXY = "https://clarelivingapp.clare-monahan.workers.dev";

// Country code lookup for WhatsApp
function getCountryCode(country) {
  var codes = {
    'UK':'44','United Kingdom':'44','England':'44','Scotland':'44','Wales':'44','Northern Ireland':'44',
    'Ireland':'353','USA':'1','United States':'1','Canada':'1','Mexico':'52',
    'Australia':'61','New Zealand':'64','South Africa':'27',
    'Germany':'49','France':'33','Spain':'34','Italy':'39','Netherlands':'31','Belgium':'32',
    'Sweden':'46','Norway':'47','Denmark':'45','Finland':'358','Iceland':'354',
    'Poland':'48','Czech Republic':'420','Hungary':'36','Austria':'43','Switzerland':'41',
    'Portugal':'351','Greece':'30','Turkey':'90','Romania':'40','Bulgaria':'359',
    'Croatia':'385','Serbia':'381','Slovenia':'386','Slovakia':'421',
    'Russia':'7','Ukraine':'380','Latvia':'371','Lithuania':'370','Estonia':'372',
    'India':'91','Pakistan':'92','Bangladesh':'880','Sri Lanka':'94','Nepal':'977',
    'China':'86','Japan':'81','South Korea':'82','Hong Kong':'852','Taiwan':'886',
    'Thailand':'60','Singapore':'65','Malaysia':'60','Indonesia':'62','Philippines':'63','Vietnam':'84',
    'Israel':'972','UAE':'971','Saudi Arabia':'966','Qatar':'974','Kuwait':'965','Bahrain':'973',
    'Jordan':'962','Lebanon':'961','Oman':'968','Iran':'98',
    'Brazil':'55','Argentina':'54','Chile':'56','Colombia':'57','Peru':'51',
    'Costa Rica':'506','Panama':'507','Ecuador':'593','Venezuela':'58','Uruguay':'598',
    'Jamaica':'1876','Puerto Rico':'1','Cuba':'53',
    'Egypt':'20','Kenya':'254','Nigeria':'234','Ghana':'233','Morocco':'212',
    'Tanzania':'255','Uganda':'256','Zimbabwe':'263',
    'Fiji':'679','Papua New Guinea':'675','Bali':'62'
  };
  return codes[country] || '44';
}
function formatWhatsAppLink(number, country) {
  var num = (number || '').replace(/[^0-9+]/g, '');
  if (num.charAt(0) === '+') return 'https://wa.me/' + num.replace(/[^0-9]/g,'');
  if (num.charAt(0) === '0') num = num.slice(1);
  var code = getCountryCode(country);
  return 'https://wa.me/' + code + num;
}
function autoSetWhatsAppCode() {
  var country = document.getElementById('ob-country').value;
  if (!country) return;
  var code = getCountryCode(country);
  var sel = document.getElementById('ob-whatsapp-code');
  if (!sel) return;
  // Try to select matching option
  var found = false;
  for (var i = 0; i < sel.options.length; i++) {
    if (sel.options[i].value === code) { sel.selectedIndex = i; found = true; break; }
  }
  // If not found in dropdown, add it
  if (!found) {
    var opt = document.createElement('option');
    opt.value = code;
    opt.textContent = '+' + code;
    opt.selected = true;
    sel.appendChild(opt);
  }
}
// --- STATE ---
var cleanDate = localStorage.getItem('na_clean_date') || '';
var moodLog   = JSON.parse(localStorage.getItem('na_mood_log')  || '[]');
// --- NAVIGATION ---
function showScreen(name) {
  // No membership gate during testing
  document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
  document.getElementById('screen-' + name).classList.add('active');
  var navItem = document.getElementById('nav-' + name);
  if (navItem) navItem.classList.add('active');
  if (name === 'meetings') { renderSavedMeetings(); }
  if (name === 'home') { loadHomeCalendar(); }
  if (name === 'account') { renderAccountScreen(); }
  if (name === 'my-events') { renderMyEvents(); }
  if (name === 'network') { loadNetwork(); updateNetworkOnlineCount(); }
  if (name === 'admin') { loadAdminStats(); renderSavedSources(); }
  if (name === 'events') { var _now = Date.now(); if (!allEvents || !allEvents.length || (_now - eventsLastLoaded) > 300000) { loadEvents(); } else { renderEvents(); } }
  if (name === 'journal') { loadJournalFolders(); renderJournalFolders(); renderJournalGroups(); }
  if (name === 'books') { loadSavedRegion(); }
  if (name === 'steps') { loadSavedRegion(); loadCustomWorksheets(); }
}
// --- CLEAN DATE ---
function saveCleanDate(val) {
  cleanDate = val;
  localStorage.setItem('na_clean_date', val);
  updateDaysCount();
}
// updateDaysCount defined below
// --- MOOD ---
function setMood(mood) {
  var today = new Date().toISOString().split('T')[0];
  moodLog = moodLog.filter(function(m) { return m.date !== today; });
  moodLog.push({ date: today, mood: mood });
  if (moodLog.length > 30) moodLog = moodLog.slice(-30);
  localStorage.setItem('na_mood_log', JSON.stringify(moodLog));
  document.querySelectorAll('.mood-btn').forEach(function(b) { b.classList.remove('selected'); });
  document.getElementById('mood-' + mood).classList.add('selected');
  renderMoodHistory();
  toast('Mood saved');
  var md = document.getElementById('mood-display');
  if (md) md.textContent = 'Feeling ' + mood + ' today';
}
function renderMoodHistory() {
  var emojis = { sad: '&#x1F614;', meh: '&#x1F610;', good: '&#x1F642;', great: '&#x1F60A;', wow: '&#x1F31F;' };
  var recent = moodLog.slice(-7);
  if (!recent.length) { document.getElementById('mood-history').innerHTML = ''; return; }
  var html = '<div style="font-size:0.62rem; color:var(--tm); margin-bottom:4px;">Recent</div><div style="display:flex; gap:5px;">';
  recent.forEach(function(m) {
    html += '<div style="text-align:center;"><div style="font-size:1rem;">' + (emojis[m.mood] || '') + '</div><div style="font-size:0.5rem; color:var(--tm);">' + m.date.slice(5) + '</div></div>';
  });
  html += '</div>';
  document.getElementById('mood-history').innerHTML = html;
}
function markTodayMood() {
  var today = new Date().toISOString().split('T')[0];
  var entry = moodLog.find(function(m) { return m.date === today; });
  if (entry) {
    document.getElementById('mood-' + entry.mood).classList.add('selected');
  }
}
// showDailyQuote defined below
// --- TOAST ---
function toast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2000);
}
// --- JOURNAL DATA ---
var journalEntries = JSON.parse(localStorage.getItem('na_journal') || '[]');
var journalFolders = [];
var currentFolderView = null; // folder object currently being viewed
var journalReturnView = 'home'; // 'home' or 'folder' — where closeJournal goes back to
var selectedFolderEmoji = '📓';
function loadJournalFolders() {
  var stored = localStorage.getItem('na_journal_folders');
  if (stored) { try { journalFolders = JSON.parse(stored); } catch(e) { journalFolders = []; } }
  if (!journalFolders.length) {
    journalFolders = [{ id: 'general', name: 'General', emoji: '📓', color: '#e8c97a' }];
    saveJournalFolders();
  }
  renderJournalFolders();
  populateFolderSelect();
}
function saveJournalFolders() {
  localStorage.setItem('na_journal_folders', JSON.stringify(journalFolders));
}
function renderJournalFolders() {
  var grid = document.getElementById('j-folder-grid');
  if (!grid) return;
  grid.innerHTML = '';
  journalFolders.forEach(function(folder) {
    var count = journalEntries.filter(function(e) { return (e.folderId || 'general') === folder.id; }).length;
    var card = document.createElement('div');
    card.style.cssText = 'background:var(--sf);border:1px solid ' + folder.color + '30;border-radius:14px;padding:14px;cursor:pointer;position:relative;';
    var delHtml = folder.id !== 'general' ? '<div class="j-folder-del" style="position:absolute;top:8px;right:8px;width:20px;height:20px;border-radius:50%;background:rgba(231,76,60,0.15);border:1px solid rgba(231,76,60,0.3);display:flex;align-items:center;justify-content:center;font-size:0.6rem;color:#e74c3c;">✕</div>' : '<div style="position:absolute;top:10px;right:10px;width:7px;height:7px;border-radius:50%;background:' + folder.color + ';"></div>';
    card.innerHTML = delHtml +
      '<div style="font-size:1.5rem;margin-bottom:6px;">' + folder.emoji + '</div>' +
      '<div style="font-size:0.84rem;font-weight:700;color:var(--tx);margin-bottom:3px;">' + folder.name + '</div>' +
      '<div style="font-size:0.72rem;color:' + folder.color + ';">' + count + ' ' + (count === 1 ? 'entry' : 'entries') + '</div>';
    (function(f) {
      card.onclick = function(e) {
        if (e.target.classList.contains('j-folder-del')) {
          if (!confirm('Delete "' + f.name + '"? Entries will be moved to General.')) return;
          journalEntries.forEach(function(en) { if (en.folderId === f.id) en.folderId = 'general'; });
          localStorage.setItem('na_journal', JSON.stringify(journalEntries));
          journalFolders = journalFolders.filter(function(x){ return x.id !== f.id; });
          saveJournalFolders();
          renderJournalFolders();
          populateFolderSelect();
          toast('Folder deleted');
          return;
        }
        openJournalFolder(f);
      };
    })(folder);
    grid.appendChild(card);
  });
}
function openJournalFolder(folder) {
  currentFolderView = folder;
  document.getElementById('j-home').style.display = 'none';
  document.getElementById('j-folder').style.display = 'block';
  document.getElementById('j-folder-title').innerHTML = folder.emoji + ' ' + folder.name;
  renderJournalFolderEntries(folder);
}
function closeJournalFolder() {
  currentFolderView = null;
  document.getElementById('j-folder').style.display = 'none';
  document.getElementById('j-home').style.display = 'block';
  renderJournalFolders();
  renderJournalEntries();
}
function renderJournalFolderEntries(folder) {
  var entries = journalEntries.filter(function(e) { return (e.folderId || 'general') === folder.id; }).slice().reverse();
  var countEl = document.getElementById('j-folder-count');
  if (countEl) countEl.textContent = entries.length + ' ' + (entries.length === 1 ? 'entry' : 'entries');
  var c = document.getElementById('j-folder-entries');
  if (!c) return;
  if (!entries.length) {
    c.innerHTML = '<div style="text-align:center;padding:30px 0;font-size:0.8rem;color:var(--tm);">No entries in this folder yet.<br><span style="font-size:0.72rem;">Tap + Write to add one.</span></div>';
    return;
  }
  c.innerHTML = '';
  entries.forEach(function(e) {
    var dt = new Date(e.date).toLocaleDateString('en-GB', {weekday:'short', day:'numeric', month:'short'});
    var info = JOURNAL_TYPES[e.type] || JOURNAL_TYPES.daily;
    var preview = e.text.slice(0, 80) + (e.text.length > 80 ? '...' : '');
    var card = document.createElement('div');
    card.style.cssText = 'background:var(--sf);border:1px solid var(--bd);border-radius:var(--r);padding:12px 14px;margin-bottom:8px;cursor:pointer;';
    card.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
      '<div style="font-size:0.72rem;color:var(--tm);">' + dt + '</div>' +
      '<div style="font-size:0.62rem;background:rgba(232,201,122,0.1);border:1px solid var(--bd);border-radius:20px;padding:2px 8px;color:var(--ac);">' + info.emoji + ' ' + info.title + '</div>' +
      '</div>' +
      '<div style="font-size:0.78rem;color:var(--tx);">' + preview + '</div>';
    (function(id) { card.onclick = function() {
      journalReturnView = 'folder';
      openJournalEntry(id);
    }; })(e.id);
    c.appendChild(card);
  });
}
function openJournalInFolder() {
  journalReturnView = 'folder';
  // Hide folder view, show write view with this folder pre-selected
  document.getElementById('j-folder').style.display = 'none';
  document.getElementById('j-write').style.display = 'block';
  // Reset write view for new entry
  currentJournalId = null;
  if (currentFolderView) currentJournalType = 'daily';
  var info = JOURNAL_TYPES[currentJournalType] || JOURNAL_TYPES.daily;
  document.getElementById('j-write-title').innerHTML = info.emoji + ' ' + info.title;
  document.getElementById('j-write-date').textContent = new Date().toLocaleDateString('en-GB', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
  document.getElementById('j-text').value = '';
  document.getElementById('j-delete-btn').style.display = 'none';
  populateFolderSelect();
  if (currentFolderView) updateFolderSelect(currentFolderView.id);
  renderJournalPrompts(currentJournalType);
  document.getElementById('j-text').focus();
}
function openNewJournalFolder() {
  document.getElementById('j-home').style.display = 'none';
  document.getElementById('j-new-folder').style.display = 'block';
  document.getElementById('j-new-folder-name').value = '';
  selectedFolderEmoji = '📓';
  // Render emoji picker
  var picker = document.getElementById('j-folder-emoji-picker');
  picker.innerHTML = '';
  FOLDER_EMOJIS.forEach(function(em) {
    var btn = document.createElement('button');
    btn.textContent = em;
    btn.style.cssText = 'width:40px;height:40px;border-radius:10px;font-size:1.2rem;cursor:pointer;border:2px solid transparent;background:var(--sf);';
    if (em === selectedFolderEmoji) { btn.style.border = '2px solid var(--ac)'; btn.style.background = 'rgba(232,201,122,0.15)'; }
    (function(e, b) {
      b.onclick = function() {
        selectedFolderEmoji = e;
        document.querySelectorAll('#j-folder-emoji-picker button').forEach(function(x){ x.style.border='2px solid transparent'; x.style.background='var(--sf)'; });
        b.style.border = '2px solid var(--ac)'; b.style.background = 'rgba(232,201,122,0.15)';
      };
    })(em, btn);
    picker.appendChild(btn);
  });
}
function closeNewJournalFolder() {
  document.getElementById('j-new-folder').style.display = 'none';
  document.getElementById('j-home').style.display = 'block';
}
function createJournalFolder() {
  var name = document.getElementById('j-new-folder-name').value.trim();
  if (!name) { toast('Please enter a folder name'); return; }
  var color = FOLDER_COLORS[journalFolders.length % FOLDER_COLORS.length];
  var newFolder = { id: Date.now().toString(), name: name, emoji: selectedFolderEmoji, color: color };
  journalFolders.push(newFolder);
  saveJournalFolders();
  populateFolderSelect();
  closeNewJournalFolder();
  renderJournalFolders();
  toast('Folder created ✓');
}
function populateFolderSelect() {
  var sel = document.getElementById('j-folder-select');
  if (!sel) return;
  sel.innerHTML = '';
  journalFolders.forEach(function(f) {
    var opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = f.emoji + ' ' + f.name;
    sel.appendChild(opt);
  });
}
function updateFolderSelect(folderId) {
  var sel = document.getElementById('j-folder-select');
  if (sel) sel.value = folderId || 'general';
}
var currentJournalId = null;
var currentJournalType = null;
function openJournal(type) {
  currentJournalId = null;
  currentJournalType = type;
  journalReturnView = 'home';
  var info = JOURNAL_TYPES[type];
  document.getElementById('j-home').style.display = 'none';
  document.getElementById('j-write').style.display = 'block';
  document.getElementById('j-write-title').innerHTML = info.emoji + ' ' + info.title;
  document.getElementById('j-write-date').textContent = new Date().toLocaleDateString('en-GB', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
  document.getElementById('j-text').value = '';
  document.getElementById('j-delete-btn').style.display = 'none';
  populateFolderSelect();
  updateFolderSelect('general');
  renderJournalPrompts(type);
  document.getElementById('j-text').focus();
}
function renderJournalPrompts(type) {
  var area = document.getElementById('j-prompts');
  var html = '<div style="background:rgba(232,201,122,0.07);border:1px solid rgba(232,201,122,0.18);border-radius:14px;padding:14px;margin-bottom:12px;">';
  if (type === 'gratitude') {
    var prompts = GRATITUDE_PROMPTS.slice().sort(function(){return Math.random()-.5;}).slice(0,3);
    html += '<div style="font-size:0.68rem;font-weight:800;color:var(--ac);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">&#x1F64F; Prompts to get you started</div>';
    html += '<div style="font-size:0.74rem;color:var(--tm);margin-bottom:8px;font-style:italic;">Use one, some, or all - or just write freely.</div>';
    prompts.forEach(function(p, i) {
      html += '<div style="padding:7px 0;' + (i < prompts.length-1 ? 'border-bottom:1px solid var(--bd);' : '') + 'font-size:0.8rem;color:var(--tx);">&#x2022; ' + p + '</div>';
    });
    html += '<button onclick="renderJournalPrompts(\'gratitude\')" style="margin-top:10px;background:none;border:1px solid var(--bd);border-radius:8px;padding:5px 12px;font-size:0.7rem;color:var(--tm);cursor:pointer;">&#8635; New prompts</button>';
  } else if (type === 'spotcheck') {
    html += '<div style="font-size:0.68rem;font-weight:800;color:var(--ac);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">&#x26A1; Spot Check - pause and be honest</div>';
    html += '<div style="font-size:0.74rem;color:var(--tm);margin-bottom:10px;font-style:italic;">Sit with these questions, then write freely below.</div>';
    SPOTCHECK_PROMPTS.forEach(function(p, i) {
      html += '<div style="padding:6px 0;' + (i < SPOTCHECK_PROMPTS.length-1 ? 'border-bottom:1px solid var(--bd);' : '') + 'font-size:0.78rem;color:var(--tm);">&#x2022; ' + p + '</div>';
    });
  } else if (type === 'step10') {
    var saved10 = localStorage.getItem('na_custom_step10') || '';
    if (saved10.trim()) {
      var lines10 = saved10.split('\n').filter(function(l){ return l.trim(); });
      html += '<div style="font-size:0.68rem;font-weight:800;color:var(--ac);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">&#x1F4CB; Your Step Inventory Questions</div>';
      lines10.forEach(function(p, i) {
        var cleanP = p.replace(/^\d+\.\s*/, '');
        html += '<div style="padding:7px 0;' + (i < lines10.length-1 ? 'border-bottom:1px solid var(--bd);' : '') + 'font-size:0.8rem;color:var(--tx);">&#x2022; ' + cleanP + '</div>';
      });
    } else {
      html += '<div style="font-size:0.8rem;color:var(--tm);font-style:italic;line-height:1.6;">Please add your own questions from your worksheet section.</div>';
    }
  } else if (type === 'guiding') {
    var savedG = localStorage.getItem('na_custom_guiding') || '';
    if (savedG.trim()) {
      var linesG = savedG.split('\n').filter(function(l){ return l.trim(); });
      html += '<div style="font-size:0.68rem;font-weight:800;color:var(--ac);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">&#x1F4D6; Your Guiding Principles Questions</div>';
      linesG.forEach(function(p, i) {
        var cleanG = p.replace(/^\d+\.\s*/, '');
        html += '<div style="padding:7px 0;' + (i < linesG.length-1 ? 'border-bottom:1px solid var(--bd);' : '') + 'font-size:0.8rem;color:var(--tx);">&#x2022; ' + cleanG + '</div>';
      });
    } else {
      html += '<div style="font-size:0.8rem;color:var(--tm);font-style:italic;line-height:1.6;">Please add your own questions from your worksheet section.</div>';
    }
  } else if (type === 'daily') {
    var prompts = DAILY_PROMPTS.slice().sort(function(){return Math.random()-.5;}).slice(0,3);
    html += '<div style="font-size:0.68rem;font-weight:800;color:var(--ac);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">&#x270D; Prompts for today</div>';
    html += '<div style="font-size:0.74rem;color:var(--tm);margin-bottom:8px;font-style:italic;">Write freely - these are just here to help you start.</div>';
    prompts.forEach(function(p, i) {
      html += '<div style="padding:7px 0;' + (i < prompts.length-1 ? 'border-bottom:1px solid var(--bd);' : '') + 'font-size:0.8rem;color:var(--tx);">&#x2022; ' + p + '</div>';
    });
    html += '<button onclick="renderJournalPrompts(\'daily\')" style="margin-top:10px;background:none;border:1px solid var(--bd);border-radius:8px;padding:5px 12px;font-size:0.7rem;color:var(--tm);cursor:pointer;">&#8635; New prompts</button>';
  }
  html += '</div>';
  area.innerHTML = html;
}
function usePrompt(prompt) {
  var ta = document.getElementById('j-text');
  if (!ta.value.trim()) {
    ta.value = prompt + '\n\n';
  } else {
    ta.value += '\n\n' + prompt + '\n\n';
  }
  ta.focus();
  ta.setSelectionRange(ta.value.length, ta.value.length);
}
function saveJournal() {
  var text = document.getElementById('j-text').value.trim();
  if (!text) { alert('Please write something first.'); return; }
  if (currentJournalId) {
    var idx = journalEntries.findIndex(function(e){ return e.id === currentJournalId; });
    if (idx > -1) { journalEntries[idx].text = text; var sf=document.getElementById('j-folder-select'); if(sf) journalEntries[idx].folderId = sf.value; }
  } else {
    var selFolder = document.getElementById('j-folder-select');
    var folderId = selFolder ? selFolder.value : 'general';
    journalEntries.push({ id: Date.now().toString(), date: new Date().toISOString(), type: currentJournalType, text: text, folderId: folderId });
  }
  localStorage.setItem('na_journal', JSON.stringify(journalEntries));
  toast('Entry saved \u2713');
  closeJournal();
}
function deleteJournal() {
  if (!currentJournalId) return;
  if (!confirm('Are you sure you want to delete this entry? This cannot be undone.')) return;
  journalEntries = journalEntries.filter(function(e){ return e.id !== currentJournalId; });
  localStorage.setItem('na_journal', JSON.stringify(journalEntries));
  closeJournal();
}
function closeJournal() {
  document.getElementById('j-write').style.display = 'none';
  if (journalReturnView === 'folder' && currentFolderView) {
    document.getElementById('j-folder').style.display = 'block';
    renderJournalFolderEntries(currentFolderView);
  } else {
    journalReturnView = 'home';
    document.getElementById('j-home').style.display = 'block';
    renderJournalFolders();
    renderJournalEntries();
  }
}
function openJournalEntry(id) {
  var entry = journalEntries.find(function(e){ return e.id === id; });
  if (!entry) return;
  currentJournalId = id;
  currentJournalType = entry.type || 'daily';
  var info = JOURNAL_TYPES[currentJournalType] || JOURNAL_TYPES.daily;
  document.getElementById('j-home').style.display = 'none';
  document.getElementById('j-folder').style.display = 'none';
  document.getElementById('j-write').style.display = 'block';
  document.getElementById('j-write-title').innerHTML = info.emoji + ' ' + info.title;
  document.getElementById('j-write-date').textContent = new Date(entry.date).toLocaleDateString('en-GB', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
  document.getElementById('j-text').value = entry.text;
  document.getElementById('j-delete-btn').style.display = 'block';
  populateFolderSelect();
  updateFolderSelect(entry.folderId || 'general');
  renderJournalPrompts(currentJournalType);
}
function renderJournalEntries() {
  var c = document.getElementById('j-entries');
  if (!journalEntries.length) {
    c.innerHTML = '<div style="text-align:center;padding:20px 0;font-size:0.8rem;color:var(--tm);">No entries yet - choose a type above to begin.</div>';
    return;
  }
  var emojis = { gratitude:'&#x1F64F;', spotcheck:'&#x26A1;', step10:'&#x1F4CB;', daily:'&#x270D;' };
  c.innerHTML = '';
  journalEntries.slice().reverse().forEach(function(e) {
    var dt = new Date(e.date).toLocaleDateString('en-GB', {weekday:'short', day:'numeric', month:'short'});
    var emoji = emojis[e.type] || '&#x270D;';
    var info = JOURNAL_TYPES[e.type] || JOURNAL_TYPES.daily;
    var preview = e.text.slice(0, 80) + (e.text.length > 80 ? '...' : '');
    // Wrapper holds card + red delete panel
    var wrap = document.createElement('div');
    wrap.className = 'j-entry-wrap';
    // Red delete panel behind
    var delPanel = document.createElement('div');
    delPanel.className = 'j-delete-reveal';
    delPanel.textContent = 'DELETE';
    (function(id, w, card) {
      delPanel.onclick = function() {
        journalEntries = journalEntries.filter(function(x) { return x.id !== id; });
        localStorage.setItem('na_journal', JSON.stringify(journalEntries));
        renderJournalEntries();
        toast('Entry deleted');
      };
    })(e.id, wrap);
    // Card on top
    var card = document.createElement('div');
    card.className = 'j-entry-card';
    card.style.background = 'var(--sf)';
    card.style.border = '1px solid var(--bd)';
    card.style.borderRadius = 'var(--r)';
    card.style.padding = '12px 14px';
    var topRow = document.createElement('div');
    topRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;';
    var dateEl = document.createElement('div');
    dateEl.style.cssText = 'font-size:0.72rem;color:var(--tm);';
    dateEl.textContent = dt;
    var folder = journalFolders.find(function(f){ return f.id === (e.folderId || 'general'); });
    var tag = document.createElement('div');
    tag.style.cssText = 'font-size:0.62rem;background:rgba(232,201,122,0.1);border:1px solid var(--bd);border-radius:20px;padding:2px 8px;color:var(--ac);';
    tag.innerHTML = emoji + ' ' + info.title + (folder && folder.id !== 'general' ? ' &nbsp;·&nbsp; ' + folder.emoji + ' ' + folder.name : '');
    topRow.appendChild(dateEl);
    topRow.appendChild(tag);
    var previewEl = document.createElement('div');
    previewEl.style.cssText = 'font-size:0.78rem;color:var(--tx);';
    previewEl.textContent = preview;
    card.appendChild(topRow);
    card.appendChild(previewEl);
    // Swipe logic
    var startX = 0;
    var startY = 0;
    var swiped = false;
    card.addEventListener('touchstart', function(ev) {
      startX = ev.touches[0].clientX;
      startY = ev.touches[0].clientY;
      swiped = false;
    }, {passive: true});
    card.addEventListener('touchmove', function(ev) {
      var dx = ev.touches[0].clientX - startX;
      var dy = ev.touches[0].clientY - startY;
      if (Math.abs(dy) > Math.abs(dx)) return; // vertical scroll
      if (dx < 0) {
        var x = Math.max(dx, -80);
        card.style.transition = 'none';
        card.style.transform = 'translateX(' + x + 'px)';
        swiped = true;
      } else if (dx > 0 && swiped) {
        card.style.transition = 'none';
        card.style.transform = 'translateX(0)';
      }
    }, {passive: true});
    card.addEventListener('touchend', function(ev) {
      var dx = ev.changedTouches[0].clientX - startX;
      card.style.transition = 'transform 0.2s ease';
      if (dx < -50) {
        card.style.transform = 'translateX(-80px)';
        swiped = true;
      } else {
        card.style.transform = 'translateX(0)';
        swiped = false;
        // Only open if it was a tap not a swipe
        if (Math.abs(dx) < 10) {
          (function(id){ openJournalEntry(id); })(e.id);
        }
      }
    });
    // Click to open on desktop
    card.addEventListener('click', function(ev) {
      if (!swiped) {
        (function(id){ openJournalEntry(id); })(e.id);
      }
    });
    wrap.appendChild(delPanel);
    wrap.appendChild(card);
    c.appendChild(wrap);
  });
}
// =====================
// MAP
// =====================
// Uses Google Maps static embed - no external library needed
function initNetMap() {
  renderNetMap();
}
function geocodeAndPlot() {
  renderNetMap();
}
function renderNetMap() {
  var el = document.getElementById('net-map');
  if (!el) return;
  var contacts = networkContacts.filter(function(c){ return c.location; });
  if (!contacts.length) {
    el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--tm);font-size:0.78rem;">Add contact locations to see them on the map</div>';
    return;
  }
  // Build Google Maps embed URL with multiple markers
  var roleColours = {
    'Sponsor': 'red',
    'Sponsee': 'green',
    'Sponsor Sister': 'green',
    'Sponsor Brother': 'green',
    'Friend in Recovery': 'yellow'
  };
  var markers = contacts.map(function(c) {
    var colour = roleColours[c.role] || 'blue';
    return 'markers=color:' + colour + '%7Clabel:' + encodeURIComponent((c.name || 'C')[0].toUpperCase()) + '%7C' + encodeURIComponent(c.location);
  }).join('&');
  var src = 'https://maps.googleapis.com/maps/api/staticmap?size=600x220&scale=2&maptype=roadmap&style=element:geometry%7Ccolor:0x1a1a2e&style=element:labels.text.fill%7Ccolor:0xe8c97a&' + markers + '&key=AIzaSyD-placeholder';
  // Use OpenStreetMap embed instead - no API key needed
  // Build a simple iframe with the first contact location as centre
  var firstLocation = encodeURIComponent(contacts[0].location);
  var iframeSrc = 'https://www.openstreetmap.org/export/embed.html?bbox=-10,49,2,61&layer=mapnik&marker=' + firstLocation;
  // Actually use a much simpler approach - clickable map link with contact list as pins
  el.innerHTML = '';
  // Show a styled list of contacts with location as clickable map links
  var wrap = document.createElement('div');
  wrap.style.cssText = 'padding:10px;height:220px;overflow-y:auto;';
  var title = document.createElement('div');
  title.style.cssText = 'font-size:0.62rem;font-weight:800;color:var(--ac);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;';
  title.textContent = 'Your Network Locations';
  wrap.appendChild(title);
  contacts.forEach(function(c) {
    var colour = { 'Sponsor':'#e74c3c','Sponsee':'#2ecc71','Sponsor Sister':'#2ecc71','Sponsor Brother':'#2ecc71','Friend in Recovery':'#f1c40f' }[c.role] || '#e8c97a';
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06);cursor:pointer;';
    var dot = document.createElement('div');
    dot.style.cssText = 'width:10px;height:10px;border-radius:50%;background:' + colour + ';flex-shrink:0;';
    row.appendChild(dot);
    var info = document.createElement('div');
    info.style.cssText = 'flex:1;';
    info.innerHTML = '<div style="font-size:0.8rem;font-weight:600;">' + c.name + '</div><div style="font-size:0.68rem;color:var(--tm);">' + c.location + '</div>';
    row.appendChild(info);
    var mapBtn = document.createElement('a');
    var ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) {
      mapBtn.href = 'https://maps.apple.com/?q=' + encodeURIComponent(c.location);
    } else {
      mapBtn.href = 'https://www.google.com/maps/search/' + encodeURIComponent(c.location);
    }
    mapBtn.target = '_blank';
    mapBtn.style.cssText = 'font-size:0.62rem;color:var(--ac);padding:4px 8px;border:1px solid rgba(232,201,122,0.3);border-radius:10px;text-decoration:none;white-space:nowrap;';
    mapBtn.textContent = 'Open Map';
    row.appendChild(mapBtn);
    wrap.appendChild(row);
  });
  el.appendChild(wrap);
}
// =====================

// =====================
// EVENTS
// =====================
var allEvents = [];
var _cache = { profiles: null, profilesTime: 0, connections: null, connectionsTime: 0 };
var CACHE_TTL = 30000; // 30 seconds
async function getCachedProfiles() {
  var now = Date.now();
  if (_cache.profiles && (now - _cache.profilesTime) < CACHE_TTL) return _cache.profiles;
  var res = await supa.from('profiles').select('*');
  if (!res.error && res.data) { _cache.profiles = res.data; _cache.profilesTime = now; }
  return res.data || [];
}
async function getCachedConnections() {
  var now = Date.now();
  if (_cache.connections && (now - _cache.connectionsTime) < CACHE_TTL) return _cache.connections;
  var res = await supa.from('connections').select('*');
  if (!res.error && res.data) { _cache.connections = res.data; _cache.connectionsTime = now; }
  return res.data || [];
}
function clearCache() { _cache.profiles = null; _cache.connections = null; }
var currentFilter = 'all';
var currentTypeFilter = 'all';
var selectedEvType = '';
var eventsLoaded = false;
var eventsLastLoaded = 0; // timestamp of last successful load
function isAdmin() {
  return currentUser && ADMIN_EMAILS.indexOf(currentUser.email) > -1;
}
function isSuperAdmin() {
  return currentUser && currentUser.email === 'clarehobson@icloud.com';
}
async function loadEvents() {
  if (!supa) { setTimeout(function() { loadEvents(); }, 1000); return; }
  // If we already have events, keep showing them while we reload — don't wipe screen
  var hasExisting = allEvents && allEvents.length > 0;
  try {
    document.getElementById('events-loading').style.display = 'block';
    if (!hasExisting) {
      document.getElementById('events-list').innerHTML = '';
      document.getElementById('events-empty').style.display = 'none';
    }
    var today = new Date();
    today.setHours(0,0,0,0);
    var todayStr = today.toISOString().split('T')[0];
    var showPast = isAdmin() && window._showPastEvents;
    var query = supa.from('events').select('*').eq('approved', true);
    if (!showPast) query = query.gte('date', todayStr);
    query = query.order('date', { ascending: showPast ? false : true });

    // Timeout protection — don't hang forever
    var timeoutPromise = new Promise(function(_, reject) {
      setTimeout(function() { reject(new Error('timeout')); }, 15000);
    });
    var result = await Promise.race([query, timeoutPromise]);

    document.getElementById('events-loading').style.display = 'none';
    if (result.error || !result.data) {
      // On failure, keep showing existing events if we have them
      if (hasExisting) { renderEvents(); return; }
      showEventsEmpty(); return;
    }
    allEvents = result.data;
    var evCountEl = document.getElementById('ev-total-count');
    if (evCountEl) evCountEl.textContent = '📅 ' + allEvents.length + ' upcoming event' + (allEvents.length !== 1 ? 's' : '') + ' worldwide';
    renderEvents();
    eventsLoaded = true;
    eventsLastLoaded = Date.now();
    checkDeepLink();
    var adminEvBtn = document.getElementById('admin-events-btn');
    if (adminEvBtn) adminEvBtn.style.display = isAdmin() ? 'inline' : 'none';
    var adminPastBtn = document.getElementById('admin-past-btn');
    if (adminPastBtn) adminPastBtn.style.display = isAdmin() ? 'inline' : 'none';
    if (isAdmin()) checkPendingBadge();
  } catch(e) {
    document.getElementById('events-loading').style.display = 'none';
    // On network error, keep showing existing events rather than blanking the screen
    if (hasExisting) { renderEvents(); return; }
    showEventsEmpty();
  }
}
// Auto-retry events when connection comes back online
window.addEventListener('online', function() {
  setTimeout(function() { loadEvents(); }, 1500);
});
function checkDeepLink() {
  try {
    var params = new URLSearchParams(window.location.search);
    var eventId = params.get('event');
    if (eventId && allEvents && allEvents.length) {
      var ev = allEvents.find(function(e) { return e.id === eventId; });
      if (ev) {
        switchTab('events');
        setTimeout(function() { openEventDetail(ev); }, 400);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  } catch(e) { console.log('Deep link check:', e); }
}
function showEventsEmpty() {
  document.getElementById('events-empty').style.display = 'block';
  document.getElementById('events-loading').style.display = 'none';
}
function filterEvents(filter) {
  currentFilter = filter;
  document.querySelectorAll('[id^="ef-"]:not([id^="eft-"])').forEach(function(b){ b.classList.remove('ef-active'); });
  var btn = document.getElementById('ef-' + filter);
  if (btn) btn.classList.add('ef-active');
  renderEvents();
}
function filterEventType(type) {
  currentTypeFilter = type;
  document.querySelectorAll('[id^="eft-"]').forEach(function(b){ b.classList.remove('ef-active'); });
  var ids = {'all':'eft-all','Convention':'eft-Convention','Unity Day':'eft-UnityDay','Marathon':'eft-Marathon','Speaker Meeting':'eft-Speaker','Workshop':'eft-Workshop'};
  var btn = document.getElementById(ids[type]);
  if (btn) btn.classList.add('ef-active');
  renderEvents();
}
function renderEvents() {
  var list = document.getElementById('events-list');
  var searchEl = document.getElementById('ev-search');
  var monthEl = document.getElementById('ev-month-filter');
  var yearEl = document.getElementById('ev-year-filter');
  var searchTerm = searchEl ? searchEl.value.toLowerCase() : '';
  var monthFilter = monthEl ? monthEl.value : '';
  var yearFilter = yearEl ? yearEl.value : '';
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var filtered = allEvents.filter(function(ev) {
    // Region filter
    if (currentFilter !== 'all') {
      var regionCountries = REGIONS[currentFilter];
      if (regionCountries) {
        var evCountry = (ev.country || '').trim();
        var match = regionCountries.some(function(rc) { return rc.toLowerCase() === evCountry.toLowerCase(); });
        if (!match) return false;
      } else {
        if (ev.country !== currentFilter) return false;
      }
    }
    // Type filter
    if (currentTypeFilter !== 'all') {
      if ((ev.type || '') !== currentTypeFilter) return false;
    }
    // Search filter
    if (searchTerm) {
      var haystack = ((ev.name || '') + ' ' + (ev.location || '') + ' ' + (ev.country || '') + ' ' + (ev.description || '')).toLowerCase();
      if (haystack.indexOf(searchTerm) === -1) return false;
    }
    // Month filter
    if (monthFilter) {
      var evDate = new Date(ev.date);
      if (MONTHS[evDate.getMonth()] !== monthFilter) return false;
    }
    // Year filter
    if (yearFilter) {
      var evDate = new Date(ev.date);
      if (evDate.getFullYear().toString() !== yearFilter) return false;
    }
    return true;
  });
  if (!filtered.length) {
    list.innerHTML = '<div style="text-align:center;padding:30px 0;color:var(--tm);font-size:0.8rem;">No events found for this filter</div>';
    var evCountEl = document.getElementById('ev-total-count');
    if (evCountEl) evCountEl.textContent = '📅 0 events found';
    return;
  }
  // Update count
  var evCountEl = document.getElementById('ev-total-count');
  if (evCountEl) {
    var isFiltered = currentFilter !== 'all' || currentTypeFilter !== 'all' || searchTerm || monthFilter || yearFilter;
    if (isFiltered) {
      evCountEl.textContent = '📅 ' + filtered.length + ' of ' + allEvents.length + ' events';
    } else {
      evCountEl.textContent = '📅 ' + allEvents.length + ' upcoming event' + (allEvents.length !== 1 ? 's' : '') + ' worldwide';
    }
  }
  list.innerHTML = '';
  var grouped = {};
  filtered.forEach(function(ev) {
    var d = new Date(ev.date);
    var key = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(ev);
  });
  Object.keys(grouped).forEach(function(month) {
    var header = document.createElement('div');
    header.style.cssText = 'font-size:0.65rem;font-weight:800;color:var(--ac);text-transform:uppercase;letter-spacing:0.1em;margin:16px 0 8px;';
    header.textContent = month;
    list.appendChild(header);
    grouped[month].forEach(function(ev) {
      list.appendChild(buildEventCard(ev));
    });
  });
}
function buildEventCard(ev) {
  var card = document.createElement('div');
  card.className = 'event-card';
  var dateStr = new Date(ev.date).toLocaleDateString('en-GB', {weekday:'short',day:'numeric',month:'short',year:'numeric'});
  if (ev.end_date) dateStr += ' - ' + new Date(ev.end_date).toLocaleDateString('en-GB', {day:'numeric',month:'short'});
  var goingCount = ev.going_users ? ev.going_users.length : 0;
  var userGoing = currentUser && ev.going_users && ev.going_users.includes(currentUser.id);
  var goingNames = ev.going_names ? ev.going_names.slice(0,3).join(', ') : '';
  if (ev.going_names && ev.going_names.length > 3) goingNames += ' +' + (ev.going_names.length - 3) + ' more';
  if (ev.flyer_url) {
    var img = document.createElement('img');
    img.className = 'event-flyer';
    img.src = ev.flyer_url;
    img.onerror = function(){ this.style.display = 'none'; };
    var topRow = document.createElement('div');
    topRow.style.cssText = 'display:flex;gap:12px;align-items:flex-start;padding:14px 16px;';
    topRow.appendChild(img);
    var body = document.createElement('div');
    body.className = 'event-body';
    body.style.flex = '1';
    body.style.minWidth = '0';
    body.style.padding = '0';
  } else {
    var topRow = null;
    var body = document.createElement('div');
    body.className = 'event-body';
  }
  var tag = document.createElement('div');
  tag.className = 'event-type-tag';
  tag.textContent = ev.type || 'Event';
  body.appendChild(tag);
  var ttl = document.createElement('div');
  ttl.className = 'event-title';
  ttl.textContent = ev.name;
  body.appendChild(ttl);
  var meta = document.createElement('div');
  meta.className = 'event-meta';
  meta.innerHTML = 'Date: ' + dateStr + '<br>Location: ' + ev.location + (ev.country ? ', ' + ev.country : '');
  if (ev.url) {
    var a = document.createElement('a');
    a.href = ev.url;
    a.target = '_blank';
    a.style.color = 'var(--ac)';
    a.textContent = 'Book / Info';
    meta.appendChild(document.createElement('br'));
    meta.appendChild(a);
  }
  body.appendChild(meta);
  var bar = document.createElement('div');
  bar.className = 'event-going-bar';
  var info = document.createElement('div');
  info.style.cssText = 'font-size:0.72rem;color:var(--tm);';
  info.textContent = goingCount > 0 ? (goingCount + ' going' + (goingNames ? ': ' + goingNames : '')) : 'Be the first going';
  bar.appendChild(info);
  var gbtn = document.createElement('button');
  gbtn.className = 'going-btn' + (userGoing ? ' going-active' : '');
  gbtn.textContent = userGoing ? 'Going' : '+ Going';
  gbtn.addEventListener('click', function(e) { toggleGoing(e, ev.id); });
  bar.appendChild(gbtn);
  body.appendChild(bar);
  if (topRow) {
    topRow.appendChild(body);
    card.appendChild(topRow);
  } else {
    card.appendChild(body);
  }
  if (isSuperAdmin()) {
    var adminBar = document.createElement('div');
    adminBar.style.cssText = 'padding:6px 16px 2px;';
    var editBtn = document.createElement('button');
    editBtn.style.cssText = 'width:100%;padding:8px;background:rgba(232,201,122,0.1);border:1px solid rgba(232,201,122,0.3);border-radius:8px;color:var(--ac);font-size:0.72rem;font-weight:700;cursor:pointer;';
    editBtn.textContent = '✏️ Edit Event';
    editBtn.addEventListener('click', function(e) { e.stopPropagation(); openAdminEventEditor(ev); });
    adminBar.appendChild(editBtn);
    body.appendChild(adminBar);
  }
  card.addEventListener('click', function(e) {
    if (e.target.tagName !== 'A' && e.target.tagName !== 'BUTTON') openEventDetail(ev);
  });
  return card;
}
async function openEventDetail(ev) {
  var dateStr = new Date(ev.date).toLocaleDateString('en-GB', {weekday:'long',day:'numeric',month:'long',year:'numeric'});
  if (ev.end_date) dateStr += ' \u2013 ' + new Date(ev.end_date).toLocaleDateString('en-GB', {weekday:'long',day:'numeric',month:'long'});
  var goingUsers = ev.going_users || [];
  var goingCount = goingUsers.length;
  var userGoing = currentUser && goingUsers.includes(currentUser.id);
  var c = document.getElementById('event-detail-content');
  c.innerHTML = '';

  // Flyer
  if (ev.flyer_url) {
    var img = document.createElement('img');
    img.src = ev.flyer_url;
    img.style.cssText = 'width:50%;max-width:300px;border-radius:12px;margin:0 auto 16px;display:block;';
    img.onerror = function(){ this.style.display = 'none'; };
    c.appendChild(img);
  }

  // Type tag
  var tag = document.createElement('div');
  tag.className = 'event-type-tag';
  tag.textContent = ev.type || 'Event';
  c.appendChild(tag);

  // Title
  var ttl = document.createElement('div');
  ttl.style.cssText = "font-family:'Cormorant Garamond',serif;font-size:1.5rem;font-weight:300;color:var(--ac);margin-bottom:8px;";
  ttl.textContent = ev.name;
  c.appendChild(ttl);

  // Date & Location
  var meta = document.createElement('div');
  meta.style.cssText = 'font-size:0.82rem;color:var(--tm);line-height:1.8;margin-bottom:14px;';
  meta.innerHTML = '📅 ' + dateStr + '<br>📍 ' + (ev.location || 'TBC') + (ev.country ? ', ' + ev.country : '');
  c.appendChild(meta);

  // Description
  if (ev.description) {
    var desc = document.createElement('div');
    desc.style.cssText = 'font-size:0.82rem;color:var(--tx);line-height:1.7;margin-bottom:14px;background:var(--sf);border:1px solid var(--bd);border-radius:10px;padding:12px;';
    desc.textContent = ev.description;
    c.appendChild(desc);
  }

  // Book / More Info link
  if (ev.url) {
    var lnk = document.createElement('a');
    lnk.href = ev.url;
    lnk.target = '_blank';
    lnk.style.cssText = 'display:block;text-align:center;margin-bottom:14px;padding:12px;background:rgba(232,201,122,0.15);border:1px solid rgba(232,201,122,0.3);border-radius:var(--r);color:var(--ac);font-weight:700;font-size:0.85rem;text-decoration:none;';
    lnk.textContent = '🔗 Book / More Info';
    c.appendChild(lnk);
  }

  // Things to do link (only if user is going)
  if (userGoing) {
    var loc = encodeURIComponent((ev.location || '') + ' ' + (ev.country || ''));
    var gygLink = document.createElement('a');
    gygLink.href = 'https://www.getyourguide.com/s/?q=' + loc;
    gygLink.target = '_blank';
    gygLink.style.cssText = 'display:block;text-align:center;margin-bottom:14px;padding:12px;background:rgba(232,201,122,0.08);border:1px solid rgba(232,201,122,0.25);border-radius:var(--r);color:var(--ac);font-weight:700;font-size:0.85rem;text-decoration:none;';
    gygLink.textContent = '🎯 Things to do nearby — GetYourGuide';
    c.appendChild(gygLink);
  }

  // Going button
  var goBtn = document.createElement('button');
  goBtn.className = 'going-btn' + (userGoing ? ' going-active' : '');
  goBtn.style.cssText = 'width:100%;padding:13px;margin-bottom:16px;';
  goBtn.textContent = userGoing ? '\u2715 Remove from going' : '+ Going';
  var evId = ev.id;
  goBtn.addEventListener('click', function(e) {
    toggleGoing(e, evId);
    setTimeout(function() {
      // Refresh detail after toggle
      var updated = allEvents.find(function(x){ return x.id === evId; });
      if (updated) openEventDetail(updated);
    }, 800);
  });
  c.appendChild(goBtn);

  // WHO'S GOING SECTION
  var gSection = document.createElement('div');
  gSection.style.cssText = 'background:var(--sf);border:1px solid var(--bd);border-radius:12px;padding:14px;margin-bottom:12px;';

  var gHeader = document.createElement('div');
  gHeader.style.cssText = 'display:flex;align-items:center;justify-content:space-between;cursor:pointer;';
  gHeader.innerHTML = '<div style="font-size:0.68rem;font-weight:800;color:var(--ac);text-transform:uppercase;letter-spacing:0.06em;">👥 Who’s Going (' + goingCount + ')</div><div id="going-chevron" style="color:var(--ac);font-size:0.9rem;">▶</div>';

  var gList = document.createElement('div');
  gList.id = 'event-going-list';
  gList.style.cssText = 'margin-top:10px;';

  if (!goingCount) {
    gList.innerHTML = '<div style="font-size:0.78rem;color:var(--tm);padding:8px 0;">Nobody yet \u2014 be the first!</div>';
  } else {
    gList.innerHTML = '<div style="font-size:0.75rem;color:var(--tm);padding:8px 0;">Loading...</div>';
  }

  // Toggle expand/collapse
  var expanded = false;
  gList.style.display = 'none';
  gHeader.addEventListener('click', function() {
    expanded = !expanded;
    gList.style.display = expanded ? 'block' : 'none';
    document.getElementById('going-chevron').textContent = expanded ? '\u25bc' : '\u25b6';
  });

  gSection.appendChild(gHeader);
  gSection.appendChild(gList);
  c.appendChild(gSection);

  // SUGGEST TO A FRIEND
  if (currentUser) {
    var suggestBtn = document.createElement('button');
    suggestBtn.style.cssText = 'width:100%;padding:12px;margin-bottom:16px;background:rgba(52,152,219,0.15);border:1px solid rgba(52,152,219,0.3);border-radius:var(--r);color:#3498db;font-weight:700;font-size:0.85rem;cursor:pointer;';
    suggestBtn.textContent = '💌 Suggest to a friend';
    var _suggestEvId = ev.id;
    var _suggestEvName = ev.name;
    suggestBtn.addEventListener('click', function() {
      var picker = document.getElementById('suggest-picker');
      if (picker && picker.style.display !== 'none') {
        picker.style.display = 'none';
      } else {
        openSuggestPicker(_suggestEvId, _suggestEvName);
      }
    });
    c.appendChild(suggestBtn);
    // Suggestion picker container
    var suggestPicker = document.createElement('div');
    suggestPicker.id = 'suggest-picker';
    suggestPicker.style.cssText = 'display:none;background:var(--sf);border:1px solid var(--bd);border-radius:12px;padding:14px;margin-bottom:16px;';
    c.appendChild(suggestPicker);
    // Share externally button
    var shareExtBtn = document.createElement('button');
    shareExtBtn.style.cssText = 'width:100%;padding:12px;margin-bottom:16px;background:rgba(46,204,113,0.15);border:1px solid rgba(46,204,113,0.3);border-radius:var(--r);color:#2ecc71;font-weight:700;font-size:0.85rem;cursor:pointer;';
    shareExtBtn.textContent = '📲 Share outside the app';
    var _shareEvName = ev.name || 'an event';
    var _shareEvDate = ev.date ? new Date(ev.date).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'}) : '';
    var _shareEvLoc = ev.location || '';
    var _shareEvId = ev.id;
    shareExtBtn.addEventListener('click', function() {
      var msg = 'Check out this event: ' + _shareEvName;
      if (_shareEvDate) msg += ' \u2014 ' + _shareEvDate;
      if (_shareEvLoc) msg += ', ' + _shareEvLoc;
      msg += '. Find it on Clean Living \ud83c\udf3f';
      shareExternalEvent(msg, _shareEvId);
    });
    c.appendChild(shareExtBtn);
  }

  // CHAT BUTTONS — only show if user is going
  if (currentUser && userGoing) {
    var chatDivider = document.createElement('div');
    chatDivider.style.cssText = 'border-top:1px solid var(--bd);margin:4px 0 14px;';
    c.appendChild(chatDivider);

    var chatLabel = document.createElement('div');
    chatLabel.style.cssText = 'font-size:0.62rem;font-weight:800;color:var(--ac);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;';
    chatLabel.textContent = '💬 Event Chats';
    c.appendChild(chatLabel);

    var startChatBtn = document.createElement('button');
    startChatBtn.style.cssText = 'width:100%;padding:12px;margin-bottom:10px;background:rgba(232,201,122,0.12);border:1px solid rgba(232,201,122,0.35);border-radius:var(--r);color:var(--ac);font-weight:700;font-size:0.85rem;cursor:pointer;';
    startChatBtn.textContent = '💬 Start a chat with attendees';
    (function(e) {
      startChatBtn.addEventListener('click', function() { openEventChatInvite(e); });
    })(ev);
    c.appendChild(startChatBtn);

    var myChatsBtn = document.createElement('button');
    myChatsBtn.id = 'ev-my-chats-btn';
    myChatsBtn.style.cssText = 'width:100%;padding:12px;margin-bottom:16px;background:transparent;border:1px solid var(--bd);border-radius:var(--r);color:var(--tm);font-weight:600;font-size:0.85rem;cursor:pointer;';
    myChatsBtn.textContent = 'View my chats for this event';
    (function(e) {
      myChatsBtn.addEventListener('click', function() { openEventChatList(e); });
    })(ev);
    c.appendChild(myChatsBtn);

    // Load unread count for this event
    if (supa) {
      supa.from('chats').select('id').eq('type','event').eq('event_id', ev.id).contains('member_ids', [currentUser.id]).then(function(r) {
        if (r.data && r.data.length) {
          myChatsBtn.textContent = 'View my chats for this event (' + r.data.length + ')';
          myChatsBtn.style.color = 'var(--ac)';
          myChatsBtn.style.borderColor = 'rgba(232,201,122,0.3)';
        }
      });
    }
  }

  // Open the modal
  document.getElementById('event-detail-modal').classList.add('open');

  // Now fetch profiles and connection statuses for going users
  if (goingCount && supa && currentUser) {
    try {
      // Filter out any invalid IDs
      var validGoingUsers = goingUsers.filter(function(uid) { return uid && typeof uid === 'string' && uid.length > 10; });
      if (!validGoingUsers.length) { gList.innerHTML = '<div style="font-size:0.78rem;color:var(--tm);padding:8px 0;">Nobody yet — be the first!</div>'; }
      else {
      // Fetch ALL profiles and filter client-side
      var profilesRes = await supa.from('profiles').select('*');
      if (profilesRes.error) console.error('Profiles query error:', profilesRes.error);
      var allProfiles = profilesRes.data || [];
      var profiles = allProfiles.filter(function(p) { return validGoingUsers.indexOf(p.id) > -1; });

      // Fetch ALL connections for current user and filter client-side
      var myId = currentUser.id;
      var connRes = await supa.from('connections').select('*');
      if (connRes.error) console.error('Connections query error:', connRes.error);
      var allConns = connRes.data || [];
      var connections = allConns.filter(function(c) { return c.requester_id === myId || c.receiver_id === myId; });

      // Build connection map: userId -> { status, direction }
      var connMap = {};
      connections.forEach(function(conn) {
        var otherId = conn.requester_id === currentUser.id ? conn.receiver_id : conn.requester_id;
        connMap[otherId] = { status: conn.status, iSent: conn.requester_id === currentUser.id };
      });

      // Render each person
      var html = '';
      profiles.forEach(function(p) {
        if (p.id === currentUser.id) {
          // Current user - show "You"
          html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--bd);">';
          html += '<div style="width:36px;height:36px;border-radius:50%;background:rgba(232,201,122,0.2);display:flex;align-items:center;justify-content:center;font-size:0.9rem;flex-shrink:0;">\u2714</div>';
          html += '<div style="flex:1;"><div style="font-weight:600;font-size:0.82rem;color:var(--ac);">You</div></div>';
          html += '</div>';
          return;
        }
        var loc = [p.region, p.country].filter(Boolean).join(', ');
        var conn = connMap[p.id];
        var connStatus = conn ? conn.status : null;

        html += '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--bd);">';
        // Avatar
        if (p.avatar_url) {
          html += '<img src="' + p.avatar_url + '" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;" onerror="this.style.display=\u0027none\u0027">';
        } else {
          var initial = (p.first_name || p.username || '?')[0].toUpperCase();
          html += '<div style="width:36px;height:36px;border-radius:50%;background:rgba(232,201,122,0.15);display:flex;align-items:center;justify-content:center;font-size:0.85rem;font-weight:700;color:var(--ac);flex-shrink:0;">' + initial + '</div>';
        }
        // Name & location
        html += '<div style="flex:1;min-width:0;">';
        html += '<div style="font-weight:600;font-size:0.82rem;">' + (p.first_name || p.username || 'Member') + '</div>';
        if (loc) html += '<div style="font-size:0.68rem;color:var(--tm);margin-top:1px;">' + loc + '</div>';
        html += '</div>';
        // Connect button
        if (connStatus === 'accepted') {
          html += '<div style="font-size:0.68rem;color:#2ecc71;font-weight:600;padding:5px 10px;border:1px solid rgba(46,204,113,0.3);border-radius:16px;">\u2714 Connected</div>';
        } else if (connStatus === 'pending') {
          if (conn.iSent) {
            html += '<div style="font-size:0.68rem;color:var(--tm);font-weight:600;padding:5px 10px;border:1px solid var(--bd);border-radius:16px;">Pending</div>';
          } else {
            html += '<button onclick="acceptConnection(\u0027' + p.id + '\u0027);setTimeout(function(){var u=allEvents.find(function(x){return x.id===\u0027' + ev.id + '\u0027;});if(u)openEventDetail(u);},600);" style="font-size:0.68rem;color:#2ecc71;font-weight:700;padding:5px 10px;background:rgba(46,204,113,0.15);border:1px solid rgba(46,204,113,0.3);border-radius:16px;cursor:pointer;">Accept</button>';
          }
        } else {
          html += '<button onclick="sendConnectionRequest(\u0027' + p.id + '\u0027);setTimeout(function(){var u=allEvents.find(function(x){return x.id===\u0027' + ev.id + '\u0027;});if(u)openEventDetail(u);},600);" style="font-size:0.68rem;color:var(--ac);font-weight:700;padding:5px 10px;background:rgba(232,201,122,0.15);border:1px solid rgba(232,201,122,0.3);border-radius:16px;cursor:pointer;">+ Connect</button>';
        }
        html += '</div>';
      });

      // Show any going users whose profiles we couldn't fetch
      var fetchedIds = profiles.map(function(p){ return p.id; });
      var missing = goingUsers.filter(function(uid){ return fetchedIds.indexOf(uid) === -1; });
      if (missing.length) {
        html += '<div style="font-size:0.72rem;color:var(--tm);padding:8px 0;">+ ' + missing.length + ' other member' + (missing.length !== 1 ? 's' : '') + '</div>';
      }

      gList.innerHTML = html || '<div style="font-size:0.78rem;color:var(--tm);padding:8px 0;">Nobody yet \u2014 be the first!</div>';
      } // end else validGoingUsers
    } catch(e) {
      console.error('Error loading going profiles:', e);
      // Fallback to names
      var names = (ev.going_names || []).join(', ');
      gList.innerHTML = '<div style="font-size:0.78rem;color:var(--tx);padding:8px 0;">' + (names || 'Error loading') + '</div>';
    }
  }
}
async function toggleGoing(e, eventId) {
  e.stopPropagation();
  if (!currentUser) { toast('Sign in to mark yourself as going'); return; }
  if (!supa) return;
  try {
    var ev = allEvents.find(function(x){ return x.id === eventId; });
    if (!ev) return;
    var going = ev.going_users ? ev.going_users.slice() : [];
    var names = ev.going_names ? ev.going_names.slice() : [];
    var username = currentUser.email.split('@')[0];
    var idx = going.indexOf(currentUser.id);
    if (idx > -1) {
      going.splice(idx, 1);
      names.splice(idx, 1);
    } else {
      going.push(currentUser.id);
      names.push(username);
    }
    await supa.from('events').update({ going_users: going, going_names: names }).eq('id', eventId);
    ev.going_users = going;
    ev.going_names = names;
    renderEvents();
    toast(idx > -1 ? 'Removed from going' : 'Added to your calendar!');
    loadHomeCalendar();
  } catch(e2) { toast('Could not update - try again'); }
}
// =====================
// SUGGEST EVENT TO FRIEND
// =====================
async function openSuggestPicker(eventId, eventName) {
  var picker = document.getElementById('suggest-picker');
  if (!picker || !supa || !currentUser) return;
  picker.style.display = 'block';
  picker.innerHTML = '<div style="font-size:0.78rem;color:var(--tm);padding:8px 0;">Loading connections...</div>';
  try {
    var connRes = await supa.from('connections').select('*');
    var conns = (connRes.data || []).filter(function(c) { return c.status === 'accepted' && (c.requester_id === currentUser.id || c.receiver_id === currentUser.id); });
    if (!conns.length) { picker.innerHTML = '<div style="font-size:0.78rem;color:var(--tm);padding:8px 0;">No connections yet — connect with people first</div>'; return; }
    var ids = conns.map(function(c) { return c.requester_id === currentUser.id ? c.receiver_id : c.requester_id; });
    var profRes = await supa.from('profiles').select('*');
    var profiles = (profRes.data || []).filter(function(p) { return ids.indexOf(p.id) > -1; });
    if (!profiles.length) { picker.innerHTML = '<div style="font-size:0.78rem;color:var(--tm);padding:8px 0;">No connections found</div>'; return; }
    var h = '<div style="font-size:0.68rem;font-weight:800;color:var(--ac);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">Send suggestion to:</div>';
    profiles.forEach(function(p) {
      var initial = (p.first_name || p.username || '?')[0].toUpperCase();
      h += '<div onclick="sendEventSuggestion(\'' + p.id + '\',\'' + eventId + '\',\'' + (eventName || '').replace(/'/g, "\\'") + '\')" style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--bd);cursor:pointer;">';
      if (p.avatar_url) {
        h += '<img src="' + p.avatar_url + '" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">';
      } else {
        h += '<div style="width:32px;height:32px;border-radius:50%;background:rgba(232,201,122,0.15);display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;color:var(--ac);">' + initial + '</div>';
      }
      h += '<div style="flex:1;font-weight:600;font-size:0.82rem;">' + (p.first_name || p.username || 'Member') + '</div>';
      h += '<div style="font-size:0.7rem;color:var(--ac);">Send ›</div>';
      h += '</div>';
    });
    h += '<div onclick="document.getElementById(\'suggest-picker\').style.display=\'none\'" style="text-align:center;padding:10px 0;font-size:0.72rem;color:var(--tm);cursor:pointer;margin-top:6px;">Cancel</div>';
    picker.innerHTML = h;
  } catch(e) { picker.innerHTML = '<div style="font-size:0.78rem;color:var(--tm);padding:8px 0;">Could not load connections</div>'; }
}
async function sendEventSuggestion(toUserId, eventId, eventName) {
  if (!supa || !currentUser) return;
  try {
    await supa.from('event_suggestions').insert({ from_user: currentUser.id, to_user: toUserId, event_id: eventId, event_name: eventName, seen: false });
    toast('Suggestion sent!');
    var picker = document.getElementById('suggest-picker');
    if (picker) picker.style.display = 'none';
  } catch(e) {
    console.error('Suggest error:', e);
    toast('Could not send suggestion — try again');
  }
}
async function loadEventSuggestions() {
  if (!supa || !currentUser) return;
  try {
    var res = await supa.from('event_suggestions').select('id,from_user,event_id,event_name,seen').eq('to_user', currentUser.id).eq('seen', false);
    if (res.error || !res.data || !res.data.length) return;
    var suggestions = res.data;
    // Get sender names
    var fromIds = suggestions.map(function(s) { return s.from_user; });
    var profRes = await supa.from('profiles').select('id,first_name');
    var profiles = (profRes.data || []).filter(function(p) { return fromIds.indexOf(p.id) > -1; });
    var nameMap = {};
    profiles.forEach(function(p) { nameMap[p.id] = p.first_name || 'Someone'; });
    // Render on home screen
    var wrap = document.getElementById('home-suggestions');
    if (!wrap) return;
    wrap.style.display = 'block';
    var h = '';
    suggestions.forEach(function(s) {
      var fromName = nameMap[s.from_user] || 'Someone';
      h += '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer;" onclick="markSuggestionSeen(\'' + s.id + '\',\'' + s.event_id + '\')">';
      h += '<div style="font-size:1.2rem;">💌</div>';
      h += '<div style="flex:1;min-width:0;"><div style="font-weight:600;font-size:0.8rem;">' + fromName + ' suggests</div>';
      h += '<div style="font-size:0.7rem;color:var(--ac);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (s.event_name || 'an event') + '</div></div>';
      h += '<div style="font-size:0.7rem;color:var(--tm);">View ›</div></div>';
    });
    document.getElementById('home-suggestions-list').innerHTML = h;
  } catch(e) { console.error('Suggestions load error:', e); }
}
async function markSuggestionSeen(suggestionId, eventId) {
  if (supa) await supa.from('event_suggestions').update({ seen: true }).eq('id', suggestionId);
  // Open the event detail
  if (allEvents && allEvents.length) {
    var ev = allEvents.find(function(x) { return x.id === eventId; });
    if (ev) { openEventDetail(ev); return; }
  }
  // If events not loaded, load them first
  if (supa) {
    var r = await supa.from('events').select('*').eq('approved', true);
    if (r.data) { allEvents = r.data; var ev = allEvents.find(function(x) { return x.id === eventId; }); if (ev) openEventDetail(ev); }
  }
}
// =====================
// SOCIAL EVENTS
// =====================
var selectedSocialType = 'Clean Time Birthday';
function selectSocialType(btn, type) {
  selectedSocialType = type;
  var btns = btn.parentElement.querySelectorAll('.role-btn');
  btns.forEach(function(b) { b.classList.remove('selected'); });
  btn.classList.add('selected');
}
var _socialFormHTML = '';
function openCreateSocialEvent() {
  if (!currentUser) { toast('Sign in to create social events'); return; }
  var modal = document.getElementById('social-event-modal');
  var content = modal.querySelector('.modal-content');
  // Save original form HTML on first use
  if (!_socialFormHTML) _socialFormHTML = content.innerHTML;
  // Restore form (invite picker may have replaced it)
  content.innerHTML = _socialFormHTML;
  document.getElementById('se-name').value = '';
  document.getElementById('se-date').value = '';
  document.getElementById('se-location').value = '';
  document.getElementById('se-note').value = '';
  selectedSocialType = 'Clean Time Birthday';
  modal.querySelectorAll('.role-btn').forEach(function(b, i) { b.classList.toggle('selected', i === 0); });
  modal.classList.add('open');
}
async function saveSocialEvent() {
  if (!supa || !currentUser) return;
  var name = document.getElementById('se-name').value.trim();
  var date = document.getElementById('se-date').value;
  if (!name || !date) { toast('Please enter a name and date'); return; }
  var location = document.getElementById('se-location').value.trim();
  var note = document.getElementById('se-note').value.trim();
  document.getElementById('se-create-btn').textContent = 'Creating...';
  document.getElementById('se-create-btn').disabled = true;
  try {
    var insertData = {
      creator_id: currentUser.id,
      name: name,
      date: date,
      type: selectedSocialType,
      location: location || null,
      note: note || null,
      invited_users: [],
      going_users: [currentUser.id],
      going_names: [currentUser.email.split('@')[0]]
    };
    var res = await supa.from('social_events').insert(insertData).select();
    if (res.error) { toast('Error: ' + res.error.message); console.error('Social event insert error:', res.error); return; }
    toast('Social event created!');
    document.getElementById('social-event-modal').classList.remove('open');
    loadSocialEvents();
  } catch(e) {
    console.error('Social event error:', e);
    toast('Could not create — try again');
  } finally {
    var _createBtn = document.getElementById('se-create-btn');
    if (_createBtn) { _createBtn.textContent = 'Create Event'; _createBtn.disabled = false; }
  }
}
async function openSocialInvitePicker(eventId, eventName) {
  if (!supa || !currentUser) return;
  try {
    var connRes = await supa.from('connections').select('*');
    var conns = (connRes.data || []).filter(function(c) { return c.status === 'accepted' && (c.requester_id === currentUser.id || c.receiver_id === currentUser.id); });
    if (!conns.length) { toast('No connections to invite yet'); return; }
    var ids = conns.map(function(c) { return c.requester_id === currentUser.id ? c.receiver_id : c.requester_id; });
    var profRes = await supa.from('profiles').select('*');
    var profiles = (profRes.data || []).filter(function(p) { return ids.indexOf(p.id) > -1; });
    if (!profiles.length) { toast('No connections found'); return; }
    // Build picker modal content
    var modal = document.getElementById('social-event-modal');
    var content = modal.querySelector('.modal-content');
    content.innerHTML = '';
    var title = document.createElement('div');
    title.className = 'modal-title';
    title.textContent = 'Invite to: ' + eventName;
    content.appendChild(title);
    var subtitle = document.createElement('div');
    subtitle.style.cssText = 'font-size:0.72rem;color:var(--tm);margin-bottom:14px;';
    subtitle.textContent = 'Tap each person you want to invite';
    content.appendChild(subtitle);
    var selectedIds = [];
    profiles.forEach(function(p) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--bd);cursor:pointer;';
      var initial = (p.first_name || p.username || '?')[0].toUpperCase();
      if (p.avatar_url) {
        row.innerHTML = '<img src="' + p.avatar_url + '" style="width:34px;height:34px;border-radius:50%;object-fit:cover;">';
      } else {
        row.innerHTML = '<div style="width:34px;height:34px;border-radius:50%;background:rgba(232,201,122,0.15);display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;color:var(--ac);">' + initial + '</div>';
      }
      var nameDiv = document.createElement('div');
      nameDiv.style.cssText = 'flex:1;font-weight:600;font-size:0.82rem;';
      nameDiv.textContent = p.first_name || p.username || 'Member';
      row.appendChild(nameDiv);
      var tick = document.createElement('div');
      tick.style.cssText = 'width:24px;height:24px;border-radius:50%;border:2px solid var(--bd);display:flex;align-items:center;justify-content:center;font-size:0.7rem;';
      tick.textContent = '';
      row.appendChild(tick);
      row.addEventListener('click', function() {
        var idx = selectedIds.indexOf(p.id);
        if (idx > -1) {
          selectedIds.splice(idx, 1);
          tick.style.borderColor = 'var(--bd)';
          tick.style.background = 'transparent';
          tick.textContent = '';
        } else {
          selectedIds.push(p.id);
          tick.style.borderColor = 'var(--ac)';
          tick.style.background = 'rgba(232,201,122,0.2)';
          tick.textContent = '✓';
          tick.style.color = 'var(--ac)';
        }
      });
      content.appendChild(row);
    });
    var sendBtn = document.createElement('button');
    sendBtn.style.cssText = 'width:100%;padding:14px;background:var(--ac);border:none;border-radius:var(--r);color:#1a1208;font-weight:800;font-size:0.9rem;cursor:pointer;margin-top:14px;';
    sendBtn.textContent = 'Send Invites';
    sendBtn.addEventListener('click', async function() {
      if (!selectedIds.length) { toast('Select at least one person'); return; }
      sendBtn.textContent = 'Sending...';
      sendBtn.disabled = true;
      await supa.from('social_events').update({ invited_users: selectedIds }).eq('id', eventId);
      toast('Invites sent to ' + selectedIds.length + ' ' + (selectedIds.length === 1 ? 'person' : 'people') + '!');
      modal.classList.remove('open');
      loadSocialEvents();
    });
    content.appendChild(sendBtn);
    var skipBtn = document.createElement('button');
    skipBtn.style.cssText = 'width:100%;padding:12px;background:transparent;border:1px solid var(--bd);border-radius:var(--r);color:var(--tm);cursor:pointer;margin-top:8px;font-size:0.82rem;';
    skipBtn.textContent = 'Skip for now';
    skipBtn.addEventListener('click', function() { modal.classList.remove('open'); });
    content.appendChild(skipBtn);
    modal.classList.add('open');
  } catch(e) { console.error('Invite picker error:', e); toast('Could not load connections'); }
}
async function loadSocialEvents() {
  if (!supa || !currentUser) return;
  var list = document.getElementById('home-social-list');
  if (!list) return;
  try {
    var res = await supa.from('social_events').select('*').order('date', { ascending: true });
    if (res.error) { console.error('Social events error:', res.error); return; }
    var events = (res.data || []).filter(function(se) {
      return se.creator_id === currentUser.id || (se.invited_users && se.invited_users.indexOf(currentUser.id) > -1);
    });
    var today = new Date(); today.setHours(0,0,0,0);
    var upcoming = events.filter(function(se) { return new Date(se.date) >= today; });
    if (!upcoming.length) {
      list.innerHTML = '<div style="font-size:0.75rem;color:var(--tm);padding:8px 0;">No upcoming social events \u2014 create one above</div>';
      return;
    }
    var allProfiles = await getCachedProfiles();
    var creatorMap = {};
    allProfiles.forEach(function(p) { creatorMap[p.id] = p.first_name || p.username || 'Someone'; });
    window._socialProfiles = allProfiles;
    window._socialEvents = upcoming;
    var h = '';
    upcoming.forEach(function(se) {
      var d = new Date(se.date);
      var dateStr = d.toLocaleDateString('en-GB', {weekday:'short', day:'numeric', month:'short'});
      var isCreator = se.creator_id === currentUser.id;
      var gc = se.going_users ? se.going_users.length : 0;
      var userGoing = se.going_users && se.going_users.indexOf(currentUser.id) > -1;
      var typeEmoji = {'Clean Time Birthday':'\ud83c\udf82','Coffee':'\u2615','Dinner':'\ud83c\udf7d\ufe0f','Social':'\ud83c\udf89','Other':'\ud83d\udccc'}[se.type] || '\ud83c\udf89';
      var creatorName = creatorMap[se.creator_id] || 'Someone';
      h += '<div onclick="openSocialEventDetail(\u0027' + se.id + '\u0027)" style="background:rgba(232,201,122,0.06);border:1px solid rgba(232,201,122,0.2);border-radius:10px;padding:12px;margin-bottom:8px;cursor:pointer;">';
      h += '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px;">';
      h += '<div style="flex:1;min-width:0;">';
      h += '<div style="font-weight:700;font-size:0.82rem;">' + typeEmoji + ' ' + se.name + '</div>';
      h += '<div style="font-size:0.68rem;color:var(--tm);margin-top:3px;">\ud83d\udcc5 ' + dateStr;
      if (se.location) h += ' \u00b7 \ud83d\udccd ' + se.location;
      h += '</div>';
      if (!isCreator) h += '<div style="font-size:0.65rem;color:var(--ac);margin-top:3px;">Invited by ' + creatorName + '</div>';
      if (se.note) h += '<div style="font-size:0.68rem;color:var(--tm);margin-top:2px;font-style:italic;">' + se.note + '</div>';
      h += '</div>';
      h += '<div style="text-align:right;">';
      if (gc) h += '<div style="font-size:0.65rem;color:var(--ac);">\ud83d\udc65 ' + gc + '</div>';
      if (userGoing) h += '<div style="font-size:0.6rem;color:#2ecc71;margin-top:2px;">\u2714 Going</div>';
      h += '</div></div>';
      h += '<div style="font-size:0.65rem;color:var(--tm);text-align:right;">Tap for details \u203a</div>';
      h += '</div>';
    });
    list.innerHTML = h;
  } catch(e) { console.error('Load social events error:', e); }
}
async function openSocialEventDetail(eventId) {
  var se = (window._socialEvents || []).find(function(x) { return x.id === eventId; });
  if (!se) { await loadSocialEvents(); se = (window._socialEvents || []).find(function(x) { return x.id === eventId; }); if (!se) return; }
  var allProfiles = window._socialProfiles || [];
  var isCreator = se.creator_id === currentUser.id;
  var userGoing = se.going_users && se.going_users.indexOf(currentUser.id) > -1;
  var typeEmoji = {'Clean Time Birthday':'\ud83c\udf82','Coffee':'\u2615','Dinner':'\ud83c\udf7d\ufe0f','Social':'\ud83c\udf89','Other':'\ud83d\udccc'}[se.type] || '\ud83c\udf89';
  var d = new Date(se.date);
  var dateStr = d.toLocaleDateString('en-GB', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
  var creatorProfile = allProfiles.find(function(p) { return p.id === se.creator_id; });
  var creatorName = creatorProfile ? (creatorProfile.first_name || creatorProfile.username || 'Someone') : 'Someone';
  var modal = document.getElementById('social-event-modal');
  var content = modal.querySelector('.modal-content');
  var h = '';
  h += '<div style="font-size:1.4rem;text-align:center;margin-bottom:4px;">' + typeEmoji + '</div>';
  h += '<div style="font-size:1.1rem;font-weight:800;text-align:center;color:var(--ac);margin-bottom:4px;">' + se.name + '</div>';
  h += '<div style="font-size:0.75rem;color:var(--tm);text-align:center;margin-bottom:4px;">Created by ' + creatorName + '</div>';
  h += '<div style="font-size:0.78rem;color:var(--tm);text-align:center;margin-bottom:6px;">\ud83d\udcc5 ' + dateStr + '</div>';
  if (se.location) h += '<div style="font-size:0.78rem;color:var(--tm);text-align:center;margin-bottom:6px;">\ud83d\udccd ' + se.location + '</div>';
  if (se.note) h += '<div style="font-size:0.78rem;color:var(--tm);text-align:center;font-style:italic;margin-bottom:12px;">' + se.note + '</div>';
  h += '<div style="border-top:1px solid var(--bd);margin:12px 0;"></div>';
  if (!isCreator) {
    if (userGoing) {
      h += '<button onclick="toggleSocialGoing(\u0027' + se.id + '\u0027,false);setTimeout(function(){openSocialEventDetail(\u0027' + se.id + '\u0027)},600)" style="width:100%;padding:12px;margin-bottom:10px;background:transparent;border:1px solid rgba(231,76,60,0.3);border-radius:var(--r);color:#e74c3c;font-weight:700;font-size:0.82rem;cursor:pointer;">\u2715 Remove from going</button>';
    } else {
      h += '<button onclick="toggleSocialGoing(\u0027' + se.id + '\u0027,true);setTimeout(function(){openSocialEventDetail(\u0027' + se.id + '\u0027)},600)" style="width:100%;padding:12px;margin-bottom:10px;background:var(--ac);border:none;border-radius:var(--r);color:#1a1208;font-weight:800;font-size:0.82rem;cursor:pointer;">+ I\u0027m Going</button>';
    }
    h += '<button onclick="declineSocialEvent(\u0027' + se.id + '\u0027)" style="width:100%;padding:10px;margin-bottom:12px;background:transparent;border:1px solid var(--bd);border-radius:var(--r);color:var(--tm);font-size:0.75rem;cursor:pointer;">Remove this invitation</button>';
  }
  var goingUsers = se.going_users || [];
  h += '<div style="font-size:0.68rem;font-weight:800;color:var(--ac);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">\ud83d\udc65 Who\u0027s Going (' + goingUsers.length + ')</div>';
  if (goingUsers.length) {
    goingUsers.forEach(function(uid) {
      var p = allProfiles.find(function(pr) { return pr.id === uid; });
      var pName = p ? (p.first_name || p.username || 'Member') : 'Member';
      var isMe = uid === currentUser.id;
      var initial = pName[0].toUpperCase();
      h += '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd);">';
      if (p && p.avatar_url) { h += '<img src="' + p.avatar_url + '" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">'; }
      else { h += '<div style="width:32px;height:32px;border-radius:50%;background:rgba(232,201,122,0.15);display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;color:var(--ac);">' + initial + '</div>'; }
      h += '<div style="flex:1;font-weight:600;font-size:0.8rem;">' + pName + (isMe ? ' (You)' : '') + '</div></div>';
    });
  } else { h += '<div style="font-size:0.75rem;color:var(--tm);padding:6px 0;">No one yet</div>'; }
  var invited = se.invited_users || [];
  var notGoing = invited.filter(function(uid) { return goingUsers.indexOf(uid) === -1; });
  if (notGoing.length) {
    h += '<div style="font-size:0.68rem;font-weight:800;color:var(--tm);text-transform:uppercase;letter-spacing:0.06em;margin:12px 0 8px;">\ud83d\udce8 Invited (' + notGoing.length + ')</div>';
    notGoing.forEach(function(uid) {
      var p = allProfiles.find(function(pr) { return pr.id === uid; });
      var pName = p ? (p.first_name || p.username || 'Member') : 'Member';
      var initial = pName[0].toUpperCase();
      h += '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd);">';
      if (p && p.avatar_url) { h += '<img src="' + p.avatar_url + '" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">'; }
      else { h += '<div style="width:32px;height:32px;border-radius:50%;background:rgba(232,201,122,0.1);display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;color:var(--tm);">' + initial + '</div>'; }
      h += '<div style="flex:1;font-weight:600;font-size:0.8rem;color:var(--tm);">' + pName + '</div>';
      if (isCreator) { h += '<button onclick="event.stopPropagation();removeSocialInvite(\u0027' + se.id + '\u0027,\u0027' + uid + '\u0027)" style="font-size:0.65rem;color:#e74c3c;background:transparent;border:1px solid rgba(231,76,60,0.3);border-radius:14px;padding:4px 10px;cursor:pointer;">Remove</button>'; }
      else { h += '<div style="font-size:0.65rem;color:var(--tm);">Awaiting</div>'; }
      h += '</div>';
    });
  }
  if (isCreator) {
    h += '<div style="margin-top:14px;">';
    h += '<button onclick="openSocialInvitePicker(\u0027' + se.id + '\u0027,\u0027' + se.name.replace(/'/g, "\\'") + '\u0027)" style="width:100%;padding:12px;background:rgba(52,152,219,0.15);border:1px solid rgba(52,152,219,0.3);border-radius:var(--r);color:#3498db;font-weight:700;font-size:0.82rem;cursor:pointer;margin-bottom:8px;">\ud83d\udc8c Invite more people</button>';
    h += '<button onclick="deleteSocialEvent(\u0027' + se.id + '\u0027)" style="width:100%;padding:12px;background:transparent;border:1px solid rgba(231,76,60,0.3);border-radius:var(--r);color:#e74c3c;font-size:0.82rem;cursor:pointer;">\ud83d\uddd1\ufe0f Delete this event</button>';
    h += '</div>';
  }
  // Share externally
  h += '<button onclick="shareSocialExternal(\u0027' + se.id + '\u0027)" style="width:100%;padding:12px;background:rgba(46,204,113,0.15);border:1px solid rgba(46,204,113,0.3);border-radius:var(--r);color:#2ecc71;font-weight:700;font-size:0.82rem;cursor:pointer;margin-top:10px;">\ud83d\udcf2 Share outside the app</button>';
  h += '<button onclick="document.getElementById(\u0027social-event-modal\u0027).classList.remove(\u0027open\u0027);loadSocialEvents();" style="width:100%;padding:12px;background:transparent;border:1px solid var(--bd);border-radius:var(--r);color:var(--tm);cursor:pointer;margin-top:12px;font-size:0.82rem;">Close</button>';
  content.innerHTML = h;
  modal.classList.add('open');
}
async function removeSocialInvite(eventId, userId) {
  if (!confirm('Remove this person from the invite?')) return;
  if (!supa) return;
  try {
    var res = await supa.from('social_events').select('invited_users,going_users,going_names').eq('id', eventId).single();
    if (res.error || !res.data) return;
    var invited = (res.data.invited_users || []).filter(function(uid) { return uid !== userId; });
    var going = (res.data.going_users || []).filter(function(uid) { return uid !== userId; });
    var names = res.data.going_names || [];
    var gIdx = (res.data.going_users || []).indexOf(userId);
    if (gIdx > -1) names.splice(gIdx, 1);
    await supa.from('social_events').update({ invited_users: invited, going_users: going, going_names: names }).eq('id', eventId);
    toast('Person removed');
    await loadSocialEvents();
    openSocialEventDetail(eventId);
  } catch(e) { toast('Could not remove \u2014 try again'); }
}
async function declineSocialEvent(eventId) {
  if (!confirm('Remove this invitation? You won\u0027t see this event anymore.')) return;
  if (!supa || !currentUser) return;
  try {
    var res = await supa.from('social_events').select('invited_users,going_users,going_names').eq('id', eventId).single();
    if (res.error || !res.data) return;
    var invited = (res.data.invited_users || []).filter(function(uid) { return uid !== currentUser.id; });
    var going = (res.data.going_users || []).filter(function(uid) { return uid !== currentUser.id; });
    var names = res.data.going_names || [];
    var gIdx = (res.data.going_users || []).indexOf(currentUser.id);
    if (gIdx > -1) names.splice(gIdx, 1);
    await supa.from('social_events').update({ invited_users: invited, going_users: going, going_names: names }).eq('id', eventId);
    toast('Invitation removed');
    document.getElementById('social-event-modal').classList.remove('open');
    loadSocialEvents();
  } catch(e) { toast('Could not remove \u2014 try again'); }
}
async function toggleSocialGoing(eventId, markGoing) {
  if (!supa || !currentUser) return;
  try {
    var res = await supa.from('social_events').select('going_users,going_names').eq('id', eventId).single();
    if (res.error || !res.data) return;
    var going = res.data.going_users || [];
    var names = res.data.going_names || [];
    var username = currentUser.email.split('@')[0];
    var idx = going.indexOf(currentUser.id);
    if (markGoing && idx === -1) {
      going.push(currentUser.id);
      names.push(username);
    } else if (!markGoing && idx > -1) {
      going.splice(idx, 1);
      names.splice(idx, 1);
    }
    await supa.from('social_events').update({ going_users: going, going_names: names }).eq('id', eventId);
    toast(markGoing ? 'You\'re going!' : 'Removed from going');
    loadSocialEvents();
  } catch(e) { toast('Could not update — try again'); }
}
async function deleteSocialEvent(eventId) {
  if (!confirm('Delete this social event?')) return;
  if (!supa) return;
  try {
    await supa.from('social_events').delete().eq('id', eventId);
    toast('Event deleted');
    loadSocialEvents();
  } catch(e) { toast('Could not delete — try again'); }
}
function shareSocialExternal(eventId) {
  var se = (window._socialEvents || []).find(function(x) { return x.id === eventId; });
  if (!se) { toast('Event not found'); return; }
  var dateStr = new Date(se.date).toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'});
  var msg = 'You are invited to: ' + se.name + ' \u2014 ' + dateStr;
  if (se.location) msg += ', ' + se.location;
  msg += '. Join me on Clean Living: cleanliving.app \ud83c\udf3f';
  shareExternalEvent(msg);
}
function shareExternalEvent(msg, eventId) {
  var shareUrl = 'https://cleanliving.app' + (eventId ? '?event=' + eventId : '');
  if (navigator.share) {
    navigator.share({
      title: 'Clean Living \u2014 Recovery App',
      text: msg,
      url: shareUrl
    }).catch(function() {});
  } else {
    var temp = document.createElement('textarea');
    temp.value = msg + '\n' + shareUrl;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand('copy');
    document.body.removeChild(temp);
    toast('Event details copied! Paste it in your message');
  }
}
function shareCleanLiving() {
  var shareText = 'Check out Clean Living \u2014 a recovery community app. Find events, connect with others, and bring your recovery together in one place. Join me at cleanliving.app \ud83c\udf3f';
  var shareUrl = 'https://cleanliving.app';
  if (navigator.share) {
    navigator.share({
      title: 'Clean Living \u2014 Recovery App',
      text: shareText,
      url: shareUrl
    }).catch(function() {});
  } else {
    // Desktop fallback - copy to clipboard
    var temp = document.createElement('textarea');
    temp.value = shareText + '\n' + shareUrl;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand('copy');
    document.body.removeChild(temp);
    toast('Link copied! Paste it in your message');
  }
}
function selectEvType(btn, type) {
  selectedEvType = type;
  document.querySelectorAll('#submit-event-modal .role-btn').forEach(function(b){ b.classList.remove('selected'); });
  if (btn) btn.classList.add('selected');
  // If called with null btn (e.g. from autofill), find and highlight the matching button
  if (!btn) {
    document.querySelectorAll('#submit-event-modal .role-btn').forEach(function(b){
      if (b.textContent.toLowerCase().indexOf(type.toLowerCase()) > -1) b.classList.add('selected');
    });
  }
}
function openSubmitEvent() {
  if (!currentUser) { showWelcomeScreen(); return; }
  document.getElementById('ev-name').value = '';
  document.getElementById('ev-date').value = '';
  document.getElementById('ev-enddate').value = '';
  document.getElementById('ev-location').value = '';
  document.getElementById('ev-country').value = '';
  document.getElementById('ev-url').value = '';
  document.getElementById('ev-flyer').value = '';
  document.getElementById('ev-desc').value = '';
  document.getElementById('ev-submit-msg').style.display = 'none';
  document.getElementById('ev-autofill-status').style.display = 'none';
  document.getElementById('ev-autofill-url').value = '';
  document.getElementById('ev-flyer-preview-wrap').style.display = 'none';
  selectedEvType = '';
  document.querySelectorAll('#submit-event-modal .role-btn').forEach(function(b){ b.classList.remove('selected'); });
  document.getElementById('submit-event-modal').classList.add('open');
}
async function submitEvent() {
  var name = document.getElementById('ev-name').value.trim();
  var date = document.getElementById('ev-date').value;
  var location = document.getElementById('ev-location').value.trim();
  var country = document.getElementById('ev-country').value;
  if (!name || !date || !location || !country) { toast('Please fill in all required fields'); return; }
  if (!supa) { toast('No connection - try again'); return; }
  // Check for duplicate events - same name and within 3 days of same date
  try {
    var existing = await supa.from('events').select('id, name, date, location').ilike('name', '%' + name.substring(0, 10) + '%');
    if (existing.data && existing.data.length) {
      var submittedDate = new Date(date);
      var duplicates = existing.data.filter(function(ev) {
        var evDate = new Date(ev.date);
        var dayDiff = Math.abs((evDate - submittedDate) / (1000 * 60 * 60 * 24));
        return dayDiff <= 3;
      });
      if (duplicates.length) {
        var dup = duplicates[0];
        var confirmed = confirm('⚠️ A similar event already exists:\n\n"' + dup.name + '"\n' + new Date(dup.date).toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'}) + ' · ' + dup.location + '\n\nIs this a different event? Tap OK to submit anyway, or Cancel to go back.');
        if (!confirmed) return;
      }
    }
  } catch(e) { /* duplicate check failed silently, continue */ }
  try {
    await supa.from('events').insert({
      name: name,
      type: selectedEvType || 'Unity Day',
      date: date,
      end_date: document.getElementById('ev-enddate').value || null,
      location: location,
      country: country,
      url: document.getElementById('ev-url').value.trim() || null,
      flyer_url: document.getElementById('ev-flyer').value.trim() || (document.getElementById('ev-flyer-preview').src && document.getElementById('ev-flyer-preview').src.startsWith('data:') ? document.getElementById('ev-flyer-preview').src : null),
      description: document.getElementById('ev-desc').value.trim() || null,
      approved: false,
      submitted_by: currentUser ? currentUser.email : 'anonymous',
      going_users: [],
      going_names: []
    });
    document.getElementById('ev-submit-msg').style.display = 'block';
    setTimeout(closeSubmitEventDirect, 2500);
  } catch(e) { toast('Submission failed - try again'); }
}
function closeSubmitEvent(event) { document.getElementById('submit-event-modal').classList.remove('open'); }
function closeSubmitEventDirect() { document.getElementById('submit-event-modal').classList.remove('open'); }
// ══════════════════════════════════════════
// EVENT CHAT SYSTEM
// ══════════════════════════════════════════

var _chatOverlay = null; // tracks the open chat overlay

function closeChatOverlay() {
  if (_chatOverlay && document.body.contains(_chatOverlay)) {
    document.body.removeChild(_chatOverlay);
  }
  _chatOverlay = null;
}

function makeChatOverlay(title, subtitle) {
  closeChatOverlay();
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.75);z-index:10000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;';
  var sheet = document.createElement('div');
  sheet.style.cssText = 'background:#1a1a2e;max-width:480px;width:100%;height:92dvh;max-height:92dvh;border-radius:20px;border:1px solid rgba(232,201,122,0.2);display:flex;flex-direction:column;overflow:hidden;box-shadow:0 4px 40px rgba(0,0,0,0.6);flex-shrink:0;';
  var hdr = document.createElement('div');
  hdr.style.cssText = 'display:flex;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid rgba(232,201,122,0.2);flex-shrink:0;';
  hdr.innerHTML = '<button onclick="closeChatOverlay()" style="background:none;border:none;color:var(--ac);font-size:1.2rem;cursor:pointer;padding:0 4px;">‹</button>' +
    '<div style="flex:1;"><div style="font-weight:700;font-size:0.92rem;color:var(--tx);">' + title + '</div>' +
    (subtitle ? '<div style="font-size:0.68rem;color:var(--tm);margin-top:2px;">' + subtitle + '</div>' : '') + '</div>' +
    '<button onclick="closeChatOverlay()" style="background:none;border:none;color:var(--tm);font-size:1.2rem;cursor:pointer;">✕</button>';
  sheet.appendChild(hdr);
  overlay.appendChild(sheet);
  _chatOverlay = overlay;
  document.body.appendChild(overlay);
  overlay.addEventListener('touchend', function(e) { if (e.target === overlay) closeChatOverlay(); });
  overlay.addEventListener('click', function(e) { if (e.target === overlay) closeChatOverlay(); });
  sheet.addEventListener('touchstart', function(e) { e.stopPropagation(); }, { passive: true });
  return { overlay: overlay, sheet: sheet };
}

// INVITE PICKER — choose who to start a chat with
async function openEventChatInvite(ev) {
  if (!currentUser || !supa) { toast('Sign in to use chat'); return; }
  var goingUsers = (ev.going_users || []).filter(function(uid) { return uid !== currentUser.id; });
  if (!goingUsers.length) { toast('Nobody else is going yet'); return; }

  var o = makeChatOverlay('Start a chat', ev.name);
  var sheet = o.sheet;
  var scroll = document.createElement('div');
  scroll.style.cssText = 'flex:1;overflow-y:auto;padding:16px;';
  scroll.innerHTML = '<div style="font-size:0.62rem;font-weight:800;color:var(--ac);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">People going to this event</div>' +
    '<div style="font-size:0.72rem;color:var(--tm);margin-bottom:14px;">Tap to select — they will choose whether to join</div>' +
    '<div id="chat-invite-list" style="margin-bottom:16px;"></div>' +
    '<div id="chat-invite-selected" style="font-size:0.72rem;color:var(--tm);margin-bottom:10px;min-height:18px;"></div>';
  sheet.appendChild(scroll);

  var sendBtn = document.createElement('button');
  sendBtn.style.cssText = 'margin:0 16px 32px;padding:14px;background:linear-gradient(135deg,var(--ac),#c9a84c);border:none;border-radius:var(--r);color:#1a1208;font-weight:700;font-size:0.9rem;cursor:pointer;opacity:0.4;pointer-events:none;';
  sendBtn.textContent = 'Send chat invite →';
  sheet.appendChild(sendBtn);

  // Load profiles
  var pr = await supa.from('profiles').select('*').in('id', goingUsers);
  var profiles = pr.data || [];
  var selectedIds = [];

  function renderInviteList() {
    var list = document.getElementById('chat-invite-list');
    if (!list) return;
    list.innerHTML = '';
    profiles.forEach(function(p) {
      var name = p.first_name || p.username || 'Member';
      var initial = name[0].toUpperCase();
      var selected = selectedIds.indexOf(p.id) > -1;
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:11px 14px;margin-bottom:8px;background:' + (selected ? 'rgba(232,201,122,0.12)' : 'var(--sf)') + ';border:1px solid ' + (selected ? 'rgba(232,201,122,0.4)' : 'var(--bd)') + ';border-radius:12px;cursor:pointer;transition:all 0.15s;';
      var avatarHtml = p.avatar_url
        ? '<img src="' + p.avatar_url + '" style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0;">'
        : '<div style="width:38px;height:38px;border-radius:50%;background:rgba(232,201,122,0.15);display:flex;align-items:center;justify-content:center;font-size:0.9rem;font-weight:700;color:var(--ac);flex-shrink:0;">' + initial + '</div>';
      row.innerHTML = avatarHtml +
        '<div style="flex:1;font-size:0.85rem;font-weight:600;color:var(--tx);">' + name + '</div>' +
        (selected ? '<div style="color:var(--ac);font-size:1rem;">✓</div>' : '');
      (function(pid) {
        row.onclick = function() {
          var idx = selectedIds.indexOf(pid);
          if (idx > -1) selectedIds.splice(idx, 1); else selectedIds.push(pid);
          renderInviteList();
          var selEl = document.getElementById('chat-invite-selected');
          if (selEl) selEl.textContent = selectedIds.length ? 'Inviting ' + selectedIds.length + ' person' + (selectedIds.length > 1 ? 's' : '') : '';
          sendBtn.style.opacity = selectedIds.length ? '1' : '0.4';
          sendBtn.style.pointerEvents = selectedIds.length ? 'auto' : 'none';
        };
      })(p.id);
      list.appendChild(row);
    });
  }
  renderInviteList();

  sendBtn.onclick = async function() {
    if (!selectedIds.length) return;
    sendBtn.textContent = 'Creating chat...';
    sendBtn.style.opacity = '0.6';
    try {
      var memberIds = [currentUser.id].concat(selectedIds);
      // expires_at = event end_date (or start date if no end_date) + 30 days
      var expiresAt = null;
      var baseDate = ev.end_date || ev.date;
      if (baseDate) {
        var d = new Date(baseDate);
        d.setDate(d.getDate() + 30);
        expiresAt = d.toISOString();
      }
      var res = await supa.from('chats').insert({
        type: 'event',
        event_id: ev.id,
        name: ev.name,
        created_by: currentUser.id,
        member_ids: memberIds,
        expires_at: expiresAt
      }).select().single();
      if (res.error) { toast('Could not create chat: ' + res.error.message); return; }
      closeChatOverlay();
      openEventChatThread(res.data, ev);
    } catch(e) { toast('Could not create chat'); }
  };
}

// CHAT LIST — all chats for this event that the user is in
async function openEventChatList(ev) {
  if (!currentUser || !supa) { toast('Sign in to use chat'); return; }
  var o = makeChatOverlay('Event Chats', ev.name);
  var sheet = o.sheet;
  var scroll = document.createElement('div');
  scroll.style.cssText = 'flex:1;overflow-y:auto;padding:16px;';
  scroll.innerHTML = '<div style="font-size:0.75rem;color:var(--tm);text-align:center;padding:20px 0;">Loading chats...</div>';
  sheet.appendChild(scroll);

  var now = new Date().toISOString();
  var res = await supa.from('chats').select('*').eq('type','event').eq('event_id', ev.id).contains('member_ids', [currentUser.id]).or('expires_at.is.null,expires_at.gt.' + now).order('created_at', {ascending:false});
  var chats = res.data || [];

  if (!chats.length) {
    scroll.innerHTML = '<div style="text-align:center;padding:30px 0;font-size:0.82rem;color:var(--tm);">No chats yet for this event.<br><span style="font-size:0.72rem;">Start one from the event detail.</span></div>';
    return;
  }

  // Load profiles for member display
  var allMemberIds = [];
  chats.forEach(function(ch) { ch.member_ids.forEach(function(id) { if (allMemberIds.indexOf(id) === -1) allMemberIds.push(id); }); });
  var pr = await supa.from('profiles').select('*').in('id', allMemberIds);
  var profiles = pr.data || [];

  scroll.innerHTML = '';
  chats.forEach(function(chat) {
    var members = chat.member_ids.filter(function(id) { return id !== currentUser.id; }).map(function(id) {
      var p = profiles.find(function(x) { return x.id === id; });
      return p ? (p.first_name || p.username || 'Member') : 'Member';
    });
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:14px;background:var(--sf);border:1px solid var(--bd);border-radius:14px;margin-bottom:10px;cursor:pointer;';
    row.innerHTML = '<div style="width:40px;height:40px;border-radius:50%;background:rgba(232,201,122,0.15);display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;">💬</div>' +
      '<div style="flex:1;"><div style="font-weight:600;font-size:0.85rem;color:var(--tx);">' + (members.join(', ') || 'Chat') + '</div>' +
      '<div style="font-size:0.7rem;color:var(--tm);margin-top:2px;">Tap to open</div></div>' +
      '<div style="color:var(--tm);font-size:1rem;">›</div>';
    (function(ch) { row.onclick = function() { closeChatOverlay(); openEventChatThread(ch, ev); }; })(chat);
    scroll.appendChild(row);
  });

  var newBtn = document.createElement('button');
  newBtn.style.cssText = 'width:100%;padding:12px;margin-top:4px;background:transparent;border:1px dashed rgba(232,201,122,0.3);border-radius:var(--r);color:var(--ac);font-size:0.82rem;cursor:pointer;';
  newBtn.textContent = '+ Start another chat';
  newBtn.onclick = function() { closeChatOverlay(); openEventChatInvite(ev); };
  scroll.appendChild(newBtn);
}

// CHAT THREAD — the actual chat UI
var _chatRealtimeChannel = null;
async function openEventChatThread(chat, ev) {
  if (!currentUser || !supa) return;
  // Unsubscribe any previous realtime channel
  if (_chatRealtimeChannel) { try { supa.removeChannel(_chatRealtimeChannel); } catch(e){} _chatRealtimeChannel = null; }

  // Load member profiles
  var pr = await supa.from('profiles').select('*').in('id', chat.member_ids);
  var profiles = pr.data || [];
  function getProfile(id) { return profiles.find(function(p) { return p.id === id; }); }
  function getName(id) { if (id === currentUser.id) return 'You'; var p = getProfile(id); return p ? (p.first_name || p.username || 'Member') : 'Member'; }

  var members = chat.member_ids.filter(function(id) { return id !== currentUser.id; }).map(getName);
  var o = makeChatOverlay(members.join(', ') || 'Chat', ev ? ev.name : (chat.name || ''));
  var sheet = o.sheet;

  // Add delete button to header
  var chatHdr = sheet.firstChild;
  var deleteChatBtn = document.createElement('button');
  deleteChatBtn.style.cssText = 'background:none;border:none;color:#e74c3c;font-size:1rem;cursor:pointer;padding:0 6px;opacity:0.75;';
  deleteChatBtn.title = 'Delete this chat';
  deleteChatBtn.textContent = '🗑️';
  deleteChatBtn.onclick = async function() {
    if (!confirm('Delete this entire chat? This cannot be undone.')) return;
    deleteChatBtn.textContent = '⏳';
    deleteChatBtn.style.pointerEvents = 'none';
    try {
      var r1 = await supa.from('chat_messages').delete().eq('chat_id', chat.id);
      if (r1.error) { toast('Could not delete messages: ' + r1.error.message); deleteChatBtn.textContent = '🗑️'; deleteChatBtn.style.pointerEvents = 'auto'; return; }
      var r2 = await supa.from('chats').delete().eq('id', chat.id);
      if (r2.error) { toast('Could not delete chat: ' + r2.error.message); deleteChatBtn.textContent = '🗑️'; deleteChatBtn.style.pointerEvents = 'auto'; return; }
      closeChatOverlay();
      toast('Chat deleted ✓');
    } catch(e) { toast('Error: ' + (e.message || 'unknown')); deleteChatBtn.textContent = '🗑️'; deleteChatBtn.style.pointerEvents = 'auto'; }
  };
  chatHdr.insertBefore(deleteChatBtn, chatHdr.lastChild);

  // Messages area
  var msgArea = document.createElement('div');
  msgArea.style.cssText = 'flex:1;min-height:0;overflow-y:scroll;-webkit-overflow-scrolling:touch;padding:14px 16px;display:flex;flex-direction:column;gap:4px;scrollbar-width:thin;scrollbar-color:rgba(232,201,122,0.3) transparent;';
  msgArea.innerHTML = '<div style="text-align:center;font-size:0.72rem;color:var(--tm);padding:8px 0;">Loading messages...</div>';
  sheet.appendChild(msgArea);

  // Input row
  var inputRow = document.createElement('div');
  inputRow.style.cssText = 'padding:10px 14px 12px;border-top:1px solid rgba(232,201,122,0.15);display:flex;gap:8px;align-items:center;flex-shrink:0;background:var(--sf);';
  var msgInput = document.createElement('input');
  msgInput.style.cssText = 'flex:1;height:42px;background:#16213e;border:1px solid rgba(232,201,122,0.15);border-radius:10px;padding:0 14px;color:#f0ead6;font-size:0.84rem;outline:none;-webkit-user-select:text;user-select:text;touch-action:manipulation;';
  msgInput.placeholder = 'Message...';
  msgInput.addEventListener('touchstart', function(e) { e.stopPropagation(); this.focus(); });
  var sendMsgBtn = document.createElement('button');
  sendMsgBtn.style.cssText = 'width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--ac),#c9a84c);border:none;color:#1a1208;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
  sendMsgBtn.textContent = '↑';
  inputRow.appendChild(msgInput);
  inputRow.appendChild(sendMsgBtn);
  sheet.appendChild(inputRow);

  // Render a message bubble
  function renderBubble(msg) {
    var mine = msg.sender_id === currentUser.id;
    var name = getName(msg.sender_id);
    var time = new Date(msg.created_at).toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'});
    var wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:' + (mine ? 'flex-end' : 'flex-start') + ';margin-bottom:6px;';
    if (!mine) {
      var nameEl = document.createElement('div');
      nameEl.style.cssText = 'font-size:0.62rem;color:var(--tm);margin-bottom:3px;margin-left:4px;';
      nameEl.textContent = name;
      wrap.appendChild(nameEl);
    }
    var bubble = document.createElement('div');
    var isJournal = msg.journal_entry && msg.journal_entry.text;
    if (isJournal) {
      bubble.style.cssText = 'max-width:80%;padding:10px 14px;border-radius:' + (mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px') + ';background:' + (mine ? 'rgba(232,201,122,0.2)' : 'var(--sf)') + ';border:1px solid rgba(232,201,122,0.3);font-size:0.82rem;color:var(--tx);line-height:1.5;';
      var jDate = new Date(msg.journal_entry.date).toLocaleDateString('en-GB',{day:'numeric',month:'short'});
      bubble.innerHTML = '<div style="font-size:0.6rem;font-weight:800;color:var(--ac);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">📓 Journal · ' + jDate + '</div>' + (msg.journal_entry.text || '').slice(0,200) + ((msg.journal_entry.text||'').length > 200 ? '...' : '');
    } else {
      bubble.style.cssText = 'max-width:80%;padding:10px 14px;border-radius:' + (mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px') + ';background:' + (mine ? 'linear-gradient(135deg,var(--ac),#c9a84c)' : 'var(--sf)') + ';font-size:0.88rem;color:' + (mine ? '#1a1208' : 'var(--tx)') + ';line-height:1.5;';
      bubble.textContent = msg.message || '';
    }
    wrap.appendChild(bubble);
    var timeEl = document.createElement('div');
    timeEl.style.cssText = 'font-size:0.62rem;color:var(--tm);margin-top:2px;' + (mine ? 'margin-right:4px;' : 'margin-left:4px;');
    timeEl.textContent = time;
    wrap.appendChild(timeEl);
    return wrap;
  }

  function scrollToBottom() { msgArea.scrollTop = msgArea.scrollHeight; }

  // Load messages
  async function loadMessages() {
    try {
      var res = await supa.from('chat_messages').select('*').eq('chat_id', chat.id).order('created_at', {ascending:true});
      if (res.error) { msgArea.innerHTML = '<div style="text-align:center;font-size:0.78rem;color:var(--tm);padding:30px 0;">Could not load messages.</div>'; return; }
      var msgs = res.data || [];
      msgArea.innerHTML = '';
      if (!msgs.length) {
        msgArea.innerHTML = '<div style="text-align:center;font-size:0.78rem;color:var(--tm);padding:30px 0;">Chat started 🌿<br><span style="font-size:0.7rem;">Waiting for people to join...</span></div>';
        return;
      }
      msgs.forEach(function(msg) { msgArea.appendChild(renderBubble(msg)); });
      scrollToBottom();
    } catch(e) {
      msgArea.innerHTML = '<div style="text-align:center;font-size:0.78rem;color:var(--tm);padding:30px 0;">Could not load messages.</div>';
    }
  }
  await loadMessages();

  // Send message
  async function doSend() {
    var txt = msgInput.value.trim();
    if (!txt) return;
    msgInput.value = '';
    try {
      await supa.from('chat_messages').insert({ chat_id: chat.id, sender_id: currentUser.id, message: txt });
      await loadMessages();
    } catch(e) { toast('Could not send message'); }
  }
  sendMsgBtn.onclick = doSend;
  msgInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') doSend(); });

  // Realtime — auto-refresh on new messages
  try {
    _chatRealtimeChannel = supa.channel('chat-' + chat.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: 'chat_id=eq.' + chat.id }, function() {
        loadMessages();
      }).subscribe();
  } catch(e) {}
}

function closeEventDetail(event) { document.getElementById('event-detail-modal').classList.remove('open'); }
function closeEventDetailDirect() { document.getElementById('event-detail-modal').classList.remove('open'); }
function closeAdminModal(event) { document.getElementById('admin-modal').classList.remove('open'); }
function closeAdminModalDirect() { document.getElementById('admin-modal').classList.remove('open'); }
async function openAdminPanel() {
  if (!isAdmin() || !supa) return;
  try {
    var result = await supa.from('events').select('id,name,date,location,country,type,url,description,flyer_url,created_at').eq('approved', false).order('created_at', { ascending: false });
    var pending = result.data || [];
    var container = document.getElementById('admin-pending-list');
    container.innerHTML = '';
    if (!pending.length) {
      container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--tm);">No pending events</div>';
    } else {
      pending.forEach(function(ev) {
        var card = document.createElement('div');
        card.style.cssText = 'background:var(--sf2);border:1px solid var(--bd);border-radius:12px;padding:12px;margin-bottom:10px;cursor:pointer;';
        var header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px;';
        var title = document.createElement('div');
        title.style.cssText = 'font-weight:700;font-size:0.88rem;flex:1;margin-right:8px;';
        title.textContent = ev.name;
        var editHint = document.createElement('div');
        editHint.style.cssText = 'font-size:0.65rem;color:var(--ac);font-weight:600;white-space:nowrap;margin-top:2px;';
        editHint.textContent = 'Tap to review ›';
        header.appendChild(title);
        header.appendChild(editHint);
        card.appendChild(header);
        var info = document.createElement('div');
        info.style.cssText = 'font-size:0.72rem;color:var(--tm);margin-bottom:8px;';
        info.textContent = (ev.type || 'Event') + ' · ' + ev.date + ' · ' + (ev.location || '') + (ev.country ? ', ' + ev.country : '');
        card.appendChild(info);
        var sub = document.createElement('div');
        sub.style.cssText = 'font-size:0.65rem;color:var(--tm);opacity:0.6;';
        sub.textContent = 'Submitted by: ' + (ev.submitted_by || 'unknown');
        card.appendChild(sub);
        (function(evObj){ card.addEventListener('click', function(){ openPendingEventEditor(evObj); }); })(ev);
        container.appendChild(card);
      });
    }
    document.getElementById('admin-modal').classList.add('open');
    loadEventSources();
  } catch(e) { toast('Could not load admin panel: ' + e.message); }
}
async function approveEvent(id) {
  await supa.from('events').update({ approved: true }).eq('id', id);
  toast('Event approved ✓');
  document.getElementById('pending-editor-modal').classList.remove('open');
  openAdminPanel();
  loadEvents();
}
async function rejectEvent(id) {
  if (!confirm('Reject and delete this event?')) return;
  await supa.from('events').delete().eq('id', id);
  toast('Event rejected and removed');
  document.getElementById('pending-editor-modal').classList.remove('open');
  openAdminPanel();
}
async function saveAndApproveEvent(id) {
  var name = document.getElementById('pe-name').value.trim();
  var date = document.getElementById('pe-date').value;
  var end_date = document.getElementById('pe-end-date').value || null;
  var location = document.getElementById('pe-location').value.trim();
  var country = document.getElementById('pe-country').value.trim();
  var type = document.getElementById('pe-type').value;
  var description = document.getElementById('pe-description').value.trim() || null;
  var url = document.getElementById('pe-url').value.trim() || null;
  // Flyer — prefer uploaded base64 preview, fall back to URL field
  var flyerUrl = null;
  var flyerPreview = document.getElementById('pe-flyer-preview');
  var flyerUrlField = document.getElementById('pe-flyer-url').value.trim();
  if (flyerPreview && flyerPreview.src && flyerPreview.src.startsWith('data:')) {
    // Uploaded image — store as base64 (small images only; for production use storage bucket)
    flyerUrl = flyerPreview.src;
  } else if (flyerUrlField) {
    flyerUrl = flyerUrlField;
  }
  if (!name || !date) { toast('Name and date are required'); return; }
  var updateData = { name, date, end_date, location, country, type, description, url, approved: true };
  if (flyerUrl) updateData.flyer_url = flyerUrl;
  var res = await supa.from('events').update(updateData).eq('id', id);
  if (res.error) { toast('Save failed: ' + res.error.message); return; }
  toast('Event saved & approved ✓');
  document.getElementById('pending-editor-modal').classList.remove('open');
  openAdminPanel();
  loadEvents();
}
function openPendingEventEditor(ev) {
  // Populate fields
  document.getElementById('pe-name').value = ev.name || '';
  document.getElementById('pe-date').value = ev.date || '';
  document.getElementById('pe-end-date').value = ev.end_date || '';
  document.getElementById('pe-location').value = ev.location || '';
  document.getElementById('pe-country').value = ev.country || '';
  document.getElementById('pe-type').value = ev.type || 'Other';
  document.getElementById('pe-description').value = ev.description || '';
  document.getElementById('pe-url').value = ev.url || '';
  document.getElementById('pe-flyer-url').value = ev.flyer_url || '';
  document.getElementById('pe-submitted-by').textContent = 'Submitted by: ' + (ev.submitted_by || 'unknown');
  // Show flyer preview if exists
  var prevWrap = document.getElementById('pe-flyer-preview-wrap');
  var prevImg = document.getElementById('pe-flyer-preview');
  if (ev.flyer_url && prevImg && prevWrap) {
    prevImg.src = ev.flyer_url;
    prevWrap.style.display = 'block';
  } else if (prevWrap) {
    prevWrap.style.display = 'none';
  }
  // Wire up buttons with this event's id
  var saveBtn = document.getElementById('pe-save-approve-btn');
  var approveBtn = document.getElementById('pe-approve-btn');
  var rejectBtn = document.getElementById('pe-reject-btn');
  saveBtn.onclick = function() { saveAndApproveEvent(ev.id); };
  approveBtn.onclick = function() { approveEvent(ev.id); };
  rejectBtn.onclick = function() { rejectEvent(ev.id); };
  document.getElementById('pending-editor-modal').classList.add('open');
}
// =====================
// MILESTONE CELEBRATIONS
// =====================

function checkMilestoneCelebration(cleanDateStr) {
  if (!cleanDateStr) return;
  try {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var start = new Date(cleanDateStr);
    start.setHours(0, 0, 0, 0);
    var daysDiff = Math.floor((today - start) / 86400000);
    if (daysDiff < 0) return;

    // Check fixed milestones
    var milestone = MILESTONES.find(function(m) { return m.days === daysDiff; });

    // Check yearly milestones (2 years+)
    if (!milestone && daysDiff > 548) {
      var years = daysDiff / 365;
      var wholeYears = Math.round(years);
      if (Math.abs(daysDiff - (wholeYears * 365)) <= 1 && wholeYears >= 2) {
        var yrs = wholeYears;
        milestone = {
          days: daysDiff,
          label: yrs + ' Years',
          keytag: '⭐',
          message: yrs >= 10
            ? yrs + ' years clean. A life rebuilt, one day at a time, for over a decade. The person you\'ve become is a gift — to yourself and to everyone around you.'
            : yrs + ' years. Think about who you were and who you are now. You did that. Keep going.'
        };
      }
    }

    if (!milestone) return;

    // Only show once per milestone — track by days count
    var shownKey = 'cl_milestone_shown_' + milestone.days + '_' + cleanDateStr;
    if (localStorage.getItem(shownKey)) return;
    localStorage.setItem(shownKey, '1');

    showMilestoneCelebration(milestone);
  } catch(e) {}
}

function showMilestoneCelebration(milestone) {
  var overlay = document.getElementById('milestone-overlay');
  if (!overlay) return;
  document.getElementById('milestone-keytag').textContent = milestone.keytag;
  document.getElementById('milestone-label').textContent = milestone.label;
  document.getElementById('milestone-message').textContent = milestone.message;
  overlay.style.display = 'flex';
}

function closeMilestone() {
  var overlay = document.getElementById('milestone-overlay');
  if (overlay) overlay.style.display = 'none';
}
// END MILESTONE CELEBRATIONS
// =====================
// ONBOARDING
// =====================
async function checkOnboarding() {
  if (!currentUser || !supa) return;
  try {
    var res = await supa.from('profiles').select('username, clean_date, country, instagram, whatsapp, facebook').eq('id', currentUser.id).single();
    var p = res.data;
    if (!p) { showOnboarding(); return; }
    var hasName = p.username && p.username.trim();
    var hasCleanDate = p.clean_date;
    var hasCountry = p.country && p.country.trim();
    if (!hasName || !hasCleanDate || !hasCountry) {
      showOnboarding();
    }
  } catch(e) {
    // If no profile row exists yet, show onboarding
    showOnboarding();
  }
}

function showOnboarding() {
  // Pre-fill any existing values
  var profile = JSON.parse(localStorage.getItem('cl_profile') || '{}');
  var nameEl = document.getElementById('ob-name');
  var dateEl = document.getElementById('ob-cleandate');
  var countryEl = document.getElementById('ob-country');
  var igEl = document.getElementById('ob-instagram');
  var waEl = document.getElementById('ob-whatsapp');
  var fbEl = document.getElementById('ob-facebook');
  if (nameEl && profile.username) nameEl.value = profile.username;
  if (dateEl && (cleanDate || profile.cleandate)) dateEl.value = cleanDate || profile.cleandate;
  if (countryEl && profile.country) countryEl.value = profile.country;
  if (igEl && profile.instagram) igEl.value = profile.instagram;
  if (waEl && profile.whatsapp) waEl.value = profile.whatsapp;
  if (fbEl && profile.facebook) fbEl.value = profile.facebook;
  var el = document.getElementById('onboarding-overlay');
  if (el) el.style.display = 'flex';
}

async function saveOnboarding() {
  var name = document.getElementById('ob-name').value.trim();
  var cleandate = document.getElementById('ob-cleandate').value;
  var country = document.getElementById('ob-country').value.trim();
  var instagram = document.getElementById('ob-instagram').value.trim();
  var whatsappCode = document.getElementById('ob-whatsapp-code').value;
  var whatsappRaw = document.getElementById('ob-whatsapp').value.trim().replace(/[^0-9]/g,'');
  // Remove leading 0 if present
  if (whatsappRaw.charAt(0) === '0') whatsappRaw = whatsappRaw.slice(1);
  var whatsapp = whatsappRaw ? '+' + whatsappCode + whatsappRaw : '';
  var facebook = document.getElementById('ob-facebook').value.trim();

  if (!name) { obMsg('Please enter your name'); return; }
  if (!cleandate) { obMsg('Please enter your clean date'); return; }
  if (!country) { obMsg('Please select your country'); return; }
  if (!instagram && !whatsapp && !facebook) { obMsg('Please add at least one social link so others can connect with you'); return; }

  obMsg('Saving...', '#5fcf80');

  if (supa && currentUser) {
    var data = { id: currentUser.id, username: name, clean_date: cleandate, country: country, instagram: instagram || null, whatsapp: whatsapp || null, facebook: facebook || null };
    var res = await supa.from('profiles').upsert(data, { onConflict: 'id' });
    if (res.error) { obMsg('Save failed — try again'); return; }
  }

  cleanDate = cleandate;
  localStorage.setItem('na_clean_date', cleandate);
  var profile = JSON.parse(localStorage.getItem('cl_profile') || '{}');
  profile.username = name;
  profile.cleandate = cleandate;
  profile.country = country;
  profile.instagram = instagram;
  profile.whatsapp = whatsapp;
  profile.facebook = facebook;
  localStorage.setItem('cl_profile', JSON.stringify(profile));
  updateDaysCount();

  var el = document.getElementById('onboarding-overlay');
  if (el) el.style.display = 'none';
  toast('Welcome to Clean Living 🙏');
}

function obMsg(msg, color) {
  var el = document.getElementById('ob-msg');
  if (el) { el.textContent = msg; el.style.color = color || '#e74c3c'; el.style.display = 'block'; }
}
// END ONBOARDING
// =====================
function openSigninModal() {
  var isSignedIn = currentUser !== null;
  document.getElementById('signin-password-wrap').style.display = isSignedIn ? 'none' : 'block';
  document.getElementById('signin-email').style.display = isSignedIn ? 'none' : 'block';
  document.querySelector('#signin-modal .modal-title').textContent = isSignedIn ? 'Account' : 'Sign In';
  document.getElementById('signin-msg').style.display = 'none';
  var btns = document.querySelectorAll('#signin-modal button:not(#home-signin-btn)');
  if (isSignedIn) {
    document.getElementById('signin-user-wrap').style.display = 'block';
    document.getElementById('signin-user-email').textContent = currentUser.email;
    // Hide sign in / create / forgot buttons
    document.querySelectorAll('#signin-modal .btn, #signin-modal button').forEach(function(b){
      if (b.textContent === 'Sign In' || b.textContent === 'Create Account' || b.textContent === 'Forgot password?') {
        b.style.display = 'none';
      }
    });
  } else {
    document.getElementById('signin-user-wrap').style.display = 'none';
    document.querySelectorAll('#signin-modal .btn, #signin-modal button').forEach(function(b){
      b.style.display = '';
    });
  }
  document.getElementById('signin-modal').classList.add('open');
}
function closeSigninModal(event) {
  document.getElementById('signin-modal').classList.remove('open');
}
function showSigninMsg(msg, colour) {
  var el = document.getElementById('signin-msg');
  el.textContent = msg;
  el.style.color = colour || 'var(--tm)';
  el.style.display = 'block';
}
async function doSignIn() {
  if (!supa) { showSigninMsg('No connection - try again'); return; }
  var email = document.getElementById('signin-email').value.trim();
  var password = document.getElementById('signin-password').value;
  if (!email || !password) { showSigninMsg('Please enter email and password'); return; }
  showSigninMsg('Signing in...');
  try {
    var result = await supa.auth.signInWithPassword({ email: email, password: password });
    if (result.error) { showSigninMsg(result.error.message, '#e74c3c'); return; }
    currentUser = result.data.user;
    pullFromCloud();
    updateSigninBtn();
    hideWelcomeScreen();
    document.getElementById('signin-modal').classList.remove('open');
    toast('Welcome back ' + currentUser.email.split('@')[0]);
    setTimeout(loadHomeCalendar, 500);
    setTimeout(loadSocialEvents, 600);
    eventsLoaded = false;
    // Check pending events for admins
    setTimeout(function() { checkPendingBadge(); var an=document.getElementById('nav-admin'); if(an) an.style.display=isAdmin()?'':'none'; checkOverdueSources(); }, 1000);
    // Milestone check — delayed to allow Supabase to load clean date
    setTimeout(function() {
      if (cleanDate) checkMilestoneCelebration(cleanDate);
    }, 3500);
  } catch(e) { showSigninMsg('Sign in failed - try again', '#e74c3c'); }
}
async function doSignUp() {
  if (!supa) { showSigninMsg('No connection - try again'); return; }
  var email = document.getElementById('signin-email').value.trim();
  var password = document.getElementById('signin-password').value;
  if (!email || !password) { showSigninMsg('Please enter email and password'); return; }
  if (password.length < 6) { showSigninMsg('Password must be at least 6 characters'); return; }
  showSigninMsg('Creating account...');
  try {
    var result = await supa.auth.signUp({ email: email, password: password });
    if (result.error) { showSigninMsg(result.error.message, '#e74c3c'); return; }
    showSigninMsg('Account created! Check your email to confirm, then sign in.', '#5fcf80');
  } catch(e) { showSigninMsg('Sign up failed - try again', '#e74c3c'); }
}
async function doResetPassword() {
  if (!supa) return;
  var email = document.getElementById('signin-email').value.trim();
  if (!email) { showSigninMsg('Enter your email address first'); return; }
  try {
    await supa.auth.resetPasswordForEmail(email);
    showSigninMsg('Password reset email sent!', '#5fcf80');
  } catch(e) { showSigninMsg('Could not send reset email', '#e74c3c'); }
}
// =====================
// AUTH & MEMBERSHIP
// =====================
var membershipTier = null; // null = not checked, 'free', 'basic', 'member'
// Tier definitions
// Membership tiers removed for testing
var BETA_CODES = [
  'CL-RUBY-7291', 'CL-JADE-4803', 'CL-ONYX-6152', 'CL-SAGE-3847', 'CL-WOLF-9264',
  'CL-HAWK-1538', 'CL-LYNX-8076', 'CL-FERN-2419', 'CL-DAWN-5630', 'CL-STAR-7943'
];
var BETA_MAX_USERS = 10;
function getUserTier() { return "member"; }
// ---- WELCOME / AUTH SCREEN ----
function showWelcomeScreen() {
  document.getElementById('app').style.display = 'none';
  document.getElementById('welcome-screen').style.display = 'flex';
}
function hideWelcomeScreen() {
  document.getElementById('welcome-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  // Check onboarding after a short delay to let Supabase load profile
  setTimeout(checkOnboarding, 2000);
}
function showAuthForm(mode) {
  document.getElementById('welcome-hero').style.display = 'none';
  document.getElementById('auth-form').style.display = 'block';
  var isSignup = mode === 'signup-associate' || mode === 'signup-trial';
  document.getElementById('auth-mode').dataset.mode = mode;
  var optWrap = document.getElementById('email-opt-in-wrap');
  if (mode === 'signup-associate') {
    if (optWrap) optWrap.style.display = 'block';
    document.getElementById('auth-title').textContent = 'Associate Sign Up';
    document.getElementById('auth-submit-btn').textContent = 'Create Account';
    document.getElementById('beta-code-wrap').style.display = 'block';
    document.getElementById('auth-switch-text').textContent = 'Already have an account?';
    document.getElementById('auth-switch-btn').textContent = 'Sign in';
  } else if (mode === 'signup-trial') {
    if (optWrap) optWrap.style.display = 'block';
    document.getElementById('auth-title').textContent = 'Sign Up as a Guest';
    document.getElementById('auth-submit-btn').textContent = 'Create Guest Account';
    document.getElementById('beta-code-wrap').style.display = 'none';
    document.getElementById('auth-switch-text').textContent = 'Already have an account?';
    document.getElementById('auth-switch-btn').textContent = 'Sign in';
  } else {
    document.getElementById('auth-title').textContent = 'Welcome back';
    document.getElementById('auth-submit-btn').textContent = 'Sign In';
    if (optWrap) optWrap.style.display = 'none';
    document.getElementById('beta-code-wrap').style.display = 'none';
    document.getElementById('auth-switch-text').textContent = "Don't have an account?";
    document.getElementById('auth-switch-btn').textContent = 'Sign up';
  }
  document.getElementById('auth-msg').style.display = 'none';
  document.getElementById('auth-forgot').style.display = mode === 'signin' ? 'block' : 'none';
}
function switchAuthMode() {
  var current = document.getElementById('auth-mode').dataset.mode;
  if (current === 'signin') {
    // Go back to welcome hero to choose path
    document.getElementById('auth-form').style.display = 'none';
    document.getElementById('welcome-hero').style.display = 'flex';
  } else {
    showAuthForm('signin');
  }
}
function showAuthMsg(msg, colour) {
  var el = document.getElementById('auth-msg');
  el.textContent = msg;
  el.style.color = colour || 'var(--tm)';
  el.style.display = 'block';
}
async function doAuth() {
  if (!supa) { showAuthMsg('No connection - please check your internet'); return; }
  var mode = document.getElementById('auth-mode').dataset.mode;
  var email = document.getElementById('auth-email').value.trim();
  var password = document.getElementById('auth-password').value;
  if (!email || !password) { showAuthMsg('Please enter your email and password'); return; }
  var isSignup = mode === 'signup-associate' || mode === 'signup-trial';
  if (isSignup && password.length < 6) { showAuthMsg('Password must be at least 6 characters'); return; }
  if (mode === 'signup-associate') {
    var eb=(document.getElementById('auth-beta-code').value||'').trim().toUpperCase();
    if(BETA_CODES.indexOf(eb)===-1){showAuthMsg("Invalid associate code \u2014 contact the app admin for access",'#e74c3c');return;}
  }

  var btnText = document.getElementById('auth-submit-btn').textContent;
  document.getElementById('auth-submit-btn').textContent = 'Please wait...';
  document.getElementById('auth-submit-btn').disabled = true;
  try {
    var result;
    if (mode === 'signin') {
      result = await supa.auth.signInWithPassword({ email: email, password: password });
    } else {
      result = await supa.auth.signUp({ email: email, password: password });
    }
    document.getElementById('auth-submit-btn').disabled = false;
    document.getElementById('auth-submit-btn').textContent = btnText;
    if (result.error) { showAuthMsg(result.error.message, '#e74c3c'); return; }
    if (isSignup) {
      var userId = result.data.user ? result.data.user.id : null;
      if (userId) {
        var role = mode === 'signup-associate' ? 'associate' : 'guest';
        var emailOptIn = document.getElementById('email-opt-in-check') ? document.getElementById('email-opt-in-check').checked : true;
        await supa.from('profiles').upsert({ id: userId, role: role, email_opt_in: emailOptIn }, { onConflict: 'id' });
        // Auto-connect new user to admin
        var ADMIN_UUID = 'c36c9b48-8c19-45e7-88d8-ab2edb199aab';
        if (userId !== ADMIN_UUID) {
          await supa.from('connections').upsert({
            requester_id: ADMIN_UUID,
            receiver_id: userId,
            status: 'accepted'
          }, { onConflict: 'requester_id,receiver_id', ignoreDuplicates: true });
        }
      }
      if (mode === 'signup-associate') {
        showAuthMsg('Associate account created! You have full permanent access. Sign in to get started.', '#5fcf80');
      } else {
        showAuthMsg('Account created! Sign in to get started.', '#5fcf80');
      }
      return;
    }
    currentUser = result.data.user;
    pullFromCloud();
    updateSigninBtn();
    updateLastSeen();
    setInterval(updateLastSeen, 3 * 60 * 1000);
    showAdminBtnIfNeeded();
    hideWelcomeScreen();
    eventsLoaded = false;
  } catch(e) {
    document.getElementById('auth-submit-btn').disabled = false;
    showAuthMsg('Something went wrong - try again', '#e74c3c');
  }
}

async function checkTrialStatus() {
  // Trial system disabled - all users have full access
  return;
}
function showTrialExpired() {
  // Trial system disabled
  return;
}
async function doAuthReset() {
  if (!supa) return;
  var email = document.getElementById('auth-email').value.trim();
  if (!email) { showAuthMsg('Enter your email address first'); return; }
  try {
    await supa.auth.resetPasswordForEmail(email, { redirectTo: 'https://cleanliving.app' });
    showAuthMsg('Password reset email sent!', '#5fcf80');
  } catch(e) { showAuthMsg('Could not send reset email', '#e74c3c'); }
}
function continueAsGuest() {
  hideWelcomeScreen();
}
// ---- PAYWALL ----
function closePaywall(e) {
  document.getElementById('paywall-modal').classList.remove('open');
}
function checkPendingBadge() {
  if (!supa || !isAdmin()) return;
  supa.from('events').select('id').eq('approved', false).then(function(r) {
    var badge = document.getElementById('admin-badge');
    if (!badge) return;
    var count = (r.data && r.data.length) || 0;
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  });
}
// =====================
// ACCOUNT SCREEN
// =====================
function renderAccountScreen() {
  var el = document.getElementById('account-screen-content');
  if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);
  if (!currentUser) {
    var signInWrap = document.createElement('div');
    signInWrap.style.cssText = 'text-align:center;padding:40px 0;';
    var icon = document.createElement('div');
    icon.style.cssText = 'font-size:3rem;margin-bottom:16px;';
    icon.textContent = 'Sign in to your account';
    var signInBtn = document.createElement('button');
    signInBtn.style.cssText = 'padding:13px 24px;background:var(--ac);border:none;border-radius:var(--r);color:#1a1208;font-weight:700;cursor:pointer;font-size:0.9rem;';
    signInBtn.textContent = 'Sign In';
    signInBtn.onclick = function() { showWelcomeScreen(); };
    signInWrap.appendChild(icon);
    signInWrap.appendChild(signInBtn);
    el.appendChild(signInWrap);
    return;
  }
  var email = currentUser.email || '';
  var name = email.split('@')[0];
  var tier = getUserTier();
  // Profile card
  var card = document.createElement('div');
  card.className = 'card';
  card.style.cssText = 'text-align:center;margin-bottom:16px;padding:20px;';
  var avatar = document.createElement('div');
  avatar.style.cssText = 'width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,var(--ac),#b8965a);display:flex;align-items:center;justify-content:center;font-size:1.8rem;font-weight:700;color:#1a1208;margin:0 auto 12px;';
  avatar.textContent = name[0].toUpperCase();
  card.appendChild(avatar);
  var nameEl = document.createElement('div');
  nameEl.style.cssText = 'font-weight:700;font-size:1rem;margin-bottom:4px;';
  nameEl.textContent = name;
  card.appendChild(nameEl);
  var emailEl = document.createElement('div');
  emailEl.style.cssText = 'font-size:0.72rem;color:var(--tm);margin-bottom:10px;';
  emailEl.textContent = email;
  card.appendChild(emailEl);
  var badge = document.createElement('span');
  badge.style.cssText = 'padding:4px 12px;border-radius:20px;font-size:0.65rem;font-weight:800;text-transform:uppercase;' + (tier==='member' ? 'background:rgba(232,201,122,0.2);color:var(--ac);border:1px solid rgba(232,201,122,0.4);' : 'background:rgba(255,255,255,0.08);color:var(--tm);border:1px solid var(--bd);');
  badge.textContent = tier.charAt(0).toUpperCase() + tier.slice(1);
  card.appendChild(badge);
  el.appendChild(card);
  // Admin section
  if (isAdmin()) {
    var adminCard = document.createElement('div');
    adminCard.style.cssText = 'background:rgba(231,76,60,0.1);border:1px solid rgba(231,76,60,0.3);border-radius:var(--r);padding:16px;margin-bottom:16px;';
    var adminTitle = document.createElement('div');
    adminTitle.style.cssText = 'font-size:0.72rem;font-weight:800;color:#e74c3c;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;';
    adminTitle.textContent = 'Admin';
    adminCard.appendChild(adminTitle);
    var reviewBtn = document.createElement('button');
    reviewBtn.style.cssText = 'width:100%;padding:12px;background:rgba(231,76,60,0.2);border:1px solid rgba(231,76,60,0.4);border-radius:10px;color:#e74c3c;font-size:0.82rem;font-weight:600;cursor:pointer;';
    reviewBtn.textContent = 'Review Pending Events';
    reviewBtn.onclick = function() { openAdminPanel(); };
    adminCard.appendChild(reviewBtn);
    el.appendChild(adminCard);
  }
  // Beta code section (only show if not already member)
  if (tier !== 'member') {
    var betaWrap = document.createElement('div');
    betaWrap.style.cssText = 'background:rgba(232,201,122,0.08);border:1px solid rgba(232,201,122,0.2);border-radius:var(--r);padding:14px;margin-bottom:12px;';
    var betaTitle = document.createElement('div');
    betaTitle.style.cssText = 'font-size:0.72rem;font-weight:800;color:var(--ac);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;';
    betaTitle.textContent = 'Have a Beta Code?';
    betaWrap.appendChild(betaTitle);
    var betaRow = document.createElement('div');
    betaRow.style.cssText = 'display:flex;gap:8px;';
    var betaInput = document.createElement('input');
    betaInput.id = 'beta-code-input';
    betaInput.className = 'input';
    betaInput.placeholder = 'Enter code...';
    betaInput.style.cssText = 'flex:1;margin:0;text-transform:uppercase;';
    var betaBtn = document.createElement('button');
    betaBtn.style.cssText = 'padding:10px 14px;background:var(--ac);border:none;border-radius:var(--r);color:#1a1208;font-weight:700;cursor:pointer;font-size:0.82rem;';
    betaBtn.textContent = 'Apply';
    betaBtn.onclick = function() {
      var code = (document.getElementById('beta-code-input').value || '').trim().toUpperCase();
      if (BETA_CODES.indexOf(code) > -1) {
        localStorage.setItem('cl_beta_code', code);
        toast('Beta code applied - full access unlocked!');
        renderAccountScreen();
      } else {
        toast('Invalid code - try again');
      }
    };
    betaRow.appendChild(betaInput);
    betaRow.appendChild(betaBtn);
    betaWrap.appendChild(betaRow);
    el.appendChild(betaWrap);
  }
  // Sign out button
  var signOutBtn = document.createElement('button');
  signOutBtn.style.cssText = 'width:100%;padding:13px;border:1px solid rgba(192,57,43,0.3);border-radius:var(--r);background:transparent;color:#e74c3c;cursor:pointer;font-size:0.85rem;margin-top:8px;';
  signOutBtn.textContent = 'Sign Out';
  signOutBtn.onclick = function() { doSignOut(); };
  el.appendChild(signOutBtn);
}
function showAvatarLightbox(url) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:99999;display:flex;align-items:center;justify-content:center;';
  overlay.onclick = function() { document.body.removeChild(overlay); };
  var img = document.createElement('img');
  img.src = url;
  img.style.cssText = 'max-width:90vw;max-height:90vh;border-radius:12px;object-fit:contain;';
  overlay.appendChild(img);
  document.body.appendChild(overlay);
}

async function updateLastSeen() {
  if (!supa || !currentUser) return;
  try {
    await supa.from('profiles').update({last_seen: new Date().toISOString()}).eq('id', currentUser.id);
  } catch(e) {}
}

// =====================
// AVATAR UPLOAD
// =====================
async function uploadAvatar(input) {
  var file = input.files[0];
  if (!file || !supa || !currentUser) return;
  toast('Uploading photo...');
  try {
    var ext = file.name.split('.').pop().toLowerCase() || 'jpg';
    if (!['jpg','jpeg','png','gif','webp'].includes(ext)) ext = 'jpg';
    var path = currentUser.id + '/avatar.' + ext;
    var uploadRes = await supa.storage.from('avatars').upload(path, file, {upsert:true, contentType:file.type});
    if (uploadRes.error) { toast('Upload failed: ' + uploadRes.error.message); return; }
    var urlRes = supa.storage.from('avatars').getPublicUrl(path);
    var publicUrl = urlRes.data.publicUrl;
    // Upsert — creates row if not exists, updates avatar_url if it does
    var upd = await supa.from('profiles').upsert({ id: currentUser.id, avatar_url: publicUrl }, { onConflict: 'id' });
    if (upd.error) { toast('Photo save failed: ' + upd.error.message); return; }
    localStorage.setItem('cl_avatar_url', publicUrl);
    updateAvatarDisplay();
    toast('Photo updated \u2713');
  } catch(e) {
    console.error('Avatar upload error:', e);
    toast('Upload error - try again');
  }
}

function updateAvatarDisplay() {
  var url = localStorage.getItem('cl_avatar_url') || '';
  var displayUrl = url ? url + '?t=' + Date.now() : '';
  // Home display-only avatar (no interaction)
  var homeDisplay = document.getElementById('home-avatar-display');
  var homeAvatarImg = document.getElementById('home-avatar-img');
  if (homeDisplay && homeAvatarImg) {
    if (displayUrl) {
      homeAvatarImg.src = displayUrl;
      homeDisplay.style.display = 'block';
    } else {
      homeDisplay.style.display = 'none';
    }
  }
  // Account sheet
  var accImg = document.getElementById('account-avatar-img');
  var accLetter = document.getElementById('account-avatar-letter');
  if (displayUrl && accImg) {
    accImg.src = displayUrl;
    accImg.style.display = 'block';
    if (accLetter) accLetter.style.display = 'none';
  } else if (accImg) {
    accImg.style.display = 'none';
    if (accLetter) accLetter.style.display = '';
  }
}

// =====================
// ACCOUNT SHEET
// =====================
function openAccountSheet() {
  var sheet = document.getElementById('account-sheet');
  if (!sheet) return;
  if (!currentUser) {
    document.getElementById('account-signedout').style.display = 'block';
    document.getElementById('account-signedin').style.display = 'none';
  } else {
    document.getElementById('account-signedout').style.display = 'none';
    document.getElementById('account-signedin').style.display = 'block';
    var email = currentUser.email || '';
    var name = email.split('@')[0];
    var tier = getUserTier();
    var profile = JSON.parse(localStorage.getItem('cl_profile') || '{}');
    var displayName = profile.username || profile.firstname || name;
    var avatarLetter = document.getElementById('account-avatar-letter');
    if (avatarLetter) avatarLetter.textContent = displayName[0].toUpperCase();
    document.getElementById('account-name').textContent = displayName;
    document.getElementById('account-email').textContent = email;
    updateAvatarDisplay();
    loadProfile();
    var badge = document.getElementById('account-tier-badge');
    if (tier === 'member') {
      badge.textContent = 'Member';
      badge.style.cssText = 'margin-left:auto;padding:4px 10px;border-radius:20px;font-size:0.62rem;font-weight:800;text-transform:uppercase;background:rgba(232,201,122,0.2);color:var(--ac);border:1px solid rgba(232,201,122,0.4);';
    } else if (tier === 'basic') {
      badge.textContent = 'Basic';
      badge.style.cssText = 'margin-left:auto;padding:4px 10px;border-radius:20px;font-size:0.62rem;font-weight:800;text-transform:uppercase;background:rgba(94,164,207,0.2);color:#5ea4cf;border:1px solid rgba(94,164,207,0.4);';
    } else {
      badge.textContent = 'Free';
      badge.style.cssText = 'margin-left:auto;padding:4px 10px;border-radius:20px;font-size:0.62rem;font-weight:800;text-transform:uppercase;background:rgba(255,255,255,0.08);color:var(--tm);border:1px solid var(--bd);';
    }
    var detail = document.getElementById('account-membership-detail');
    if (tier === 'member') {
      detail.textContent = 'Full access - Journal, Events, Movement, Network, Community';
    } else if (tier === 'basic') {
      detail.textContent = 'Basic access - Network and Worksheets included';
    } else {
      detail.textContent = 'Free plan - meetings, books and daily readings';
    }
    // Admin nav tab visibility
    var adminNav = document.getElementById('nav-admin');
    if (adminNav) adminNav.style.display = isAdmin() ? '' : 'none';
  }
  sheet.classList.add('open');
  loadGuideState();
}
function closeAccountSheet(event) {
  document.getElementById('account-sheet').classList.remove('open');
}
function updateSigninBtn() {
  var btn = document.getElementById('home-signin-btn');
  var outBtn = document.getElementById('home-signout-btn');
  if (currentUser) {
    if (btn) {
      var initial = (currentUser.email.split('@')[0][0] || 'A').toUpperCase();
      btn.textContent = initial;
      btn.style.background = 'linear-gradient(135deg,var(--ac),#b8965a)';
      btn.style.color = '#1a1208';
      btn.style.fontWeight = '700';
    }
    if (outBtn) outBtn.style.display = 'block';
  } else {
    if (btn) {
      btn.textContent = '👤';
      btn.style.background = 'var(--sf)';
      btn.style.color = 'var(--ac)';
      btn.style.fontWeight = 'normal';
    }
    if (outBtn) outBtn.style.display = 'none';
  }
}
function showAdminBtnIfNeeded() {
  // Admin access is inside the account sheet - no floating button needed
}
async function deleteMyAccount() {
  if (!currentUser || !supa) { toast('Not signed in'); return; }
  if (!confirm('Are you sure you want to delete your account? All your data will be permanently removed. This cannot be undone.')) return;
  if (!confirm('This will delete your profile, all connections, journal entries, social events, and everything associated with your account. Are you absolutely sure?')) return;
  try {
    var uid = currentUser.id;
    toast('Deleting account...');
    // Delete from all tables
    await supa.from('social_events').delete().eq('creator_id', uid);
    await supa.from('event_suggestions').delete().or('from_user.eq.' + uid + ',to_user.eq.' + uid);
    await supa.from('shared_favourites').delete().or('from_user.eq.' + uid + ',to_user.eq.' + uid);
    await supa.from('connections').delete().or('requester_id.eq.' + uid + ',receiver_id.eq.' + uid);
    await supa.from('user_data').delete().eq('user_id', uid);
    await supa.from('profiles').delete().eq('id', uid);
    // Remove going status from events
    var evRes = await supa.from('events').select('id,going_users,going_names');
    if (evRes.data) {
      for (var i = 0; i < evRes.data.length; i++) {
        var ev = evRes.data[i];
        if (ev.going_users && ev.going_users.indexOf(uid) > -1) {
          var gu = ev.going_users.filter(function(u) { return u !== uid; });
          var gn = ev.going_names || [];
          var idx = ev.going_users.indexOf(uid);
          if (idx > -1 && gn.length > idx) gn.splice(idx, 1);
          await supa.from('events').update({ going_users: gu, going_names: gn }).eq('id', ev.id);
        }
      }
    }
    // Sign out
    await supa.auth.signOut();
    localStorage.clear();
    toast('Account deleted. Thank you for being part of Clean Living.');
    setTimeout(function() { location.reload(); }, 2000);
  } catch(e) {
    console.error('Delete account error:', e);
    toast('There was a problem deleting your account. Please email cleanliving.app@icloud.com for help.');
  }
}
async function doSignOut() {
  if (!supa) return;
  try {
    await supa.auth.signOut();
  } catch(e) {}
  currentUser = null;
  updateSigninBtn();
  var adminNav = document.getElementById('nav-admin');
  if (adminNav) adminNav.style.display = 'none';
  var sheet = document.getElementById('account-sheet');
  if (sheet) sheet.classList.remove('open');
  showWelcomeScreen();
  toast('Signed out');
}
// =====================
// HOME EVENTS CALENDAR
// =====================
function loadHomeCalendar() {
  if (!currentUser || !supa) return;
  // Use cached allEvents if available, otherwise fetch
  function doRenderHome(data) {
      if (!data) return;
      if (!allEvents || !allEvents.length) { allEvents = data; checkDeepLink(); }
      var userId = currentUser.id;
      var today = new Date();
      today.setHours(0,0,0,0);
      var myEvents = data.filter(function(ev) {
        if (!ev.going_users) return false;
        if (ev.going_users.indexOf(userId) === -1) return false;
        return new Date(ev.date) >= today;
      });
      // Sort by date
      myEvents.sort(function(a,b){ return new Date(a.date) - new Date(b.date); });
      // Render home upcoming events section
      var wrap = document.getElementById('home-upcoming-events');
      var list = document.getElementById('home-upcoming-list');
      if (!wrap || !list) return;
      if (!myEvents.length) {
        wrap.style.display = 'none';
        return;
      }
      wrap.style.display = 'block';
      // Store for click handlers
      window._homeUpcoming = myEvents;
      // Group by month, show up to 5 events
      var shown = myEvents.slice(0, 5);
      var h = '';
      var lastMonth = '';
      shown.forEach(function(ev, idx) {
        var d = new Date(ev.date);
        var month = d.toLocaleDateString('en-GB',{month:'long', year:'numeric'});
        if (month !== lastMonth) {
          h += '<div style="font-size:0.65rem;color:var(--tm);text-transform:uppercase;letter-spacing:0.06em;margin:' + (lastMonth ? '10px' : '0') + ' 0 6px;padding-bottom:4px;border-bottom:1px solid var(--bd);">' + month + '</div>';
          lastMonth = month;
        }
        var gc = ev.going_users ? ev.going_users.length : 0;
        h += '<div data-home-ev="' + idx + '" style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer;">';
        h += '<div style="flex-shrink:0;width:40px;text-align:center;background:rgba(232,201,122,0.1);border:1px solid rgba(232,201,122,0.25);border-radius:8px;padding:6px 2px;">';
        h += '<div style="font-size:1rem;font-weight:800;color:var(--ac);line-height:1;">' + d.getDate() + '</div>';
        h += '<div style="font-size:0.5rem;text-transform:uppercase;color:var(--tm);">' + d.toLocaleDateString('en-GB',{month:'short'}) + '</div>';
        h += '</div>';
        h += '<div style="flex:1;min-width:0;">';
        h += '<div style="font-weight:600;font-size:0.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + ev.name + '</div>';
        h += '<div style="font-size:0.65rem;color:var(--tm);margin-top:2px;">📍 ' + (ev.location || '') + (ev.country ? ', ' + ev.country : '') + '</div>';
        h += '</div>';
        if (gc) h += '<div style="font-size:0.62rem;color:var(--ac);white-space:nowrap;">👥 ' + gc + '</div>';
        h += '<div style="font-size:0.8rem;color:var(--tm);">›</div>';
        h += '</div>';
      });
      if (myEvents.length > 5) {
        h += '<div onclick="showScreen(\'my-events\')" style="text-align:center;padding:10px 0;font-size:0.72rem;color:var(--ac);cursor:pointer;font-weight:600;">+ ' + (myEvents.length - 5) + ' more events</div>';
      }
      list.innerHTML = h;
      // Add click handlers via delegation
      list.querySelectorAll('[data-home-ev]').forEach(function(el) {
        el.addEventListener('click', function() {
          var idx = parseInt(el.getAttribute('data-home-ev'));
          var ev = window._homeUpcoming[idx];
          if (ev) openEventDetail(ev);
        });
      });
  }
  // Use cached events if available, otherwise fetch fresh
  if (allEvents && allEvents.length) {
    doRenderHome(allEvents);
  } else {
    supa.from('events').select('*').eq('approved', true).order('date', { ascending: true }).then(function(result) {
      if (result.data) doRenderHome(result.data);
    });
  }
}
// =====================
// EVENTS AI AUTOFILL
// =====================
function showAutofillStatus(msg, type) {
  var el = document.getElementById('ev-autofill-status');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  el.style.background = type === 'error' ? '#3a0a0a' : '#2a2410';
  el.style.color = type === 'error' ? '#ff6b6b' : '#e8c97a';
  el.style.border = '2px solid ' + (type === 'error' ? '#e74c3c' : '#e8c97a');
}
function fillEventForm(data) {
  if (data.name) document.getElementById('ev-name').value = data.name;
  if (data.date) document.getElementById('ev-date').value = data.date;
  if (data.end_date) document.getElementById('ev-enddate').value = data.end_date;
  if (data.location) document.getElementById('ev-location').value = data.location;
  if (data.url) document.getElementById('ev-url').value = data.url;
  if (data.description) document.getElementById('ev-desc').value = data.description;
  if (data.country) {
    var sel = document.getElementById('ev-country');
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value.toLowerCase() === (data.country || '').toLowerCase()) {
        sel.selectedIndex = i; break;
      }
    }
  }
  if (data.type) {
    var typeMap = { 'convention':'Convention','marathon':'Marathon','speaker':'Speaker Meeting','workshop':'Workshop','other':'Other' };
    var t = (data.type || '').toLowerCase();
    for (var key in typeMap) {
      if (t.indexOf(key) > -1) { selectEvType(null, typeMap[key]); break; }
    }
  }
}
async function autofillFromUrl() {
  var url = document.getElementById('ev-autofill-url').value.trim();
  if (!url) { showAutofillStatus('Please paste a website URL first', 'error'); return; }
  showAutofillStatus('Reading page... this may take a moment', 'ok');
  try {
    var response = await fetch(AI_PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        system: 'Extract event details from URLs or web content. Respond ONLY with valid JSON. Fields: name (string), date (YYYY-MM-DD), end_date (YYYY-MM-DD or null), location (string), country (use the exact country name from this list: UK, Ireland, Austria, Belgium, Croatia, Czech Republic, Denmark, Finland, France, Germany, Greece, Hungary, Iceland, Italy, Luxembourg, Malta, Netherlands, Norway, Poland, Portugal, Romania, Russia, Serbia, Slovakia, Slovenia, Spain, Sweden, Switzerland, Turkey, Ukraine, USA, Canada, Mexico, Argentina, Brazil, Chile, Colombia, Costa Rica, Cuba, Ecuador, Jamaica, Panama, Peru, Puerto Rico, Uruguay, Venezuela, Bahrain, China, Hong Kong, India, Indonesia, Israel, Japan, Jordan, Kuwait, Lebanon, Malaysia, Nepal, Oman, Pakistan, Philippines, Qatar, Saudi Arabia, Singapore, South Korea, Sri Lanka, Taiwan, Thailand, UAE, Vietnam, Australia, Bali, Fiji, New Zealand, Papua New Guinea, Egypt, Ghana, Kenya, Morocco, Nigeria, South Africa, Tanzania, Uganda, Zimbabwe, Worldwide, Other), url (string), description (max 150 chars), type (Convention/Marathon/Speaker Meeting/Workshop/Other). Use null for unknown fields.',
        messages: [{ role: 'user', content: 'Extract event details from: ' + url }]
      })
    });
    var data = await response.json();
    if (data.error) { showAutofillStatus('Could not read URL - please fill in manually', 'error'); return; }
    var text = (data.content && data.content[0]) ? data.content[0].text : '';
    var clean = text.replace(/```json|```/g, '').trim();
    var event = JSON.parse(clean);
    fillEventForm(event);
    showAutofillStatus('✓ Details filled in - please check and edit as needed', 'ok');
  } catch(e) {
    showAutofillStatus('Could not read URL - please fill in the details manually', 'error');
  }
}
async function autofillFromImage(input) {
  var file = input.files[0];
  if (!file) return;
  // Always show preview
  var reader = new FileReader();
  reader.onload = function(e) {
    var preview = document.getElementById('ev-flyer-preview');
    var wrap = document.getElementById('ev-flyer-preview-wrap');
    if (preview) { preview.src = e.target.result; }
    if (wrap) wrap.style.display = 'block';
  };
  reader.readAsDataURL(file);
  showAutofillStatus('Reading flyer... ✨', 'ok');
  // Read as base64 for API
  var b64reader = new FileReader();
  b64reader.onload = async function(e) {
    var base64 = e.target.result.split(',')[1];
    var mediaType = file.type || 'image/jpeg';
    try {
      var response = await fetch(AI_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 800,
          system: 'Extract event details from flyer images. Respond ONLY with valid JSON. Fields: name, date (YYYY-MM-DD), end_date (YYYY-MM-DD or null), location, country (use the exact country name from this list: UK, Ireland, Austria, Belgium, Croatia, Czech Republic, Denmark, Finland, France, Germany, Greece, Hungary, Iceland, Italy, Luxembourg, Malta, Netherlands, Norway, Poland, Portugal, Romania, Russia, Serbia, Slovakia, Slovenia, Spain, Sweden, Switzerland, Turkey, Ukraine, USA, Canada, Mexico, Argentina, Brazil, Chile, Colombia, Costa Rica, Cuba, Ecuador, Jamaica, Panama, Peru, Puerto Rico, Uruguay, Venezuela, Bahrain, China, Hong Kong, India, Indonesia, Israel, Japan, Jordan, Kuwait, Lebanon, Malaysia, Nepal, Oman, Pakistan, Philippines, Qatar, Saudi Arabia, Singapore, South Korea, Sri Lanka, Taiwan, Thailand, UAE, Vietnam, Australia, Bali, Fiji, New Zealand, Papua New Guinea, Egypt, Ghana, Kenya, Morocco, Nigeria, South Africa, Tanzania, Uganda, Zimbabwe, Worldwide, Other), url, description (max 150 chars), type (Convention/Marathon/Speaker Meeting/Workshop/Other). Use null for unknown fields.',
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 }},
              { type: 'text', text: 'Extract all event details from this flyer. Return JSON only.' }
            ]
          }]
        })
      });
      var data = await response.json();
      if (data.error) { showAutofillStatus('API error: ' + JSON.stringify(data.error), 'error'); return; }
      var text = (data.content && data.content[0]) ? data.content[0].text : '';
      var clean = text.replace(/```json|```/g, '').trim();
      var event = JSON.parse(clean);
      fillEventForm(event);
      showAutofillStatus('✓ Flyer read - please check and complete the details', 'ok');
    } catch(e) {
      showAutofillStatus('Error: ' + (e.message || JSON.stringify(e)), 'error');
    }
  };
  b64reader.readAsDataURL(file);
}
// =====================
// SAVED MEETINGS
// =====================
var personalMeetings = JSON.parse(localStorage.getItem('na_personal_meetings') || '[]');
var editingMeetingId = null;
var editingMeetingType = null;
function buildZoomLink(meetingId, password) {
  // Clean the meeting ID - remove spaces and dashes
  var id = (meetingId || '').replace(/[\s\-]/g, '');
  if (!id) return null;
  // Use zoommtg:// deep link to open Zoom app directly
  var link = 'zoommtg://zoom.us/join?confno=' + id;
  if (password) link += '&pwd=' + encodeURIComponent(password);
  return link;
}
function renderMeetingCard(m, type) {
  var card = document.createElement('div');
  card.style.cssText = 'background:var(--sf);border:1px solid rgba(232,201,122,0.35);border-radius:var(--r);padding:14px 16px;margin-bottom:10px;box-shadow:0 2px 8px rgba(0,0,0,0.25);';
  var top = document.createElement('div');
  top.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px;';
  var nameEl = document.createElement('div');
  nameEl.style.cssText = 'font-weight:700;font-size:0.88rem;flex:1;';
  nameEl.textContent = m.name;
  top.appendChild(nameEl);
  var editBtn = document.createElement('button');
  editBtn.textContent = '✏️';
  editBtn.style.cssText = 'background:transparent;border:none;font-size:0.9rem;cursor:pointer;padding:0 0 0 8px;flex-shrink:0;';
  editBtn.onclick = function() { openEditMeeting(m.id, type, m); };
  top.appendChild(editBtn);
  card.appendChild(top);
  if (m.time) {
    var timeEl = document.createElement('div');
    timeEl.style.cssText = 'font-size:0.72rem;color:var(--tm);margin-bottom:8px;';
    timeEl.textContent = '🕐 ' + m.time;
    card.appendChild(timeEl);
  }
  // Build join button
  var joinBtn = document.createElement('a');
  var zid = m.meetingId || m.meeting_id;
  var zoomLink = zid ? buildZoomLink(zid, m.password) : null;
  joinBtn.href = zoomLink || m.url || '#';
  if (!zoomLink) joinBtn.target = '_blank';
  joinBtn.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:8px;padding:11px;background:var(--ac);color:#1a1208;border-radius:10px;font-size:0.82rem;font-weight:700;text-decoration:none;';
  joinBtn.innerHTML = '<span>▶</span><span>Join on Zoom</span>';
  // If using URL instead of ID, adjust label
  if (!zid && m.url) {
    joinBtn.innerHTML = '<span>▶</span><span>Join Meeting</span>';
  }
  // Show meeting ID and password info
  if (zid) {
    var idRow = document.createElement('div');
    idRow.style.cssText = 'display:flex;gap:12px;margin-bottom:8px;font-size:0.7rem;color:var(--tm);';
    idRow.innerHTML = '<span>ID: <b style="color:var(--tx);">' + zid + '</b></span>' +
      (m.password ? '<span>Password: <b style="color:var(--tx);">' + m.password + '</b></span>' : '');
    card.appendChild(idRow);
  }
  card.appendChild(joinBtn);
  // Share button for personal meetings only
  if (type === 'personal') {
    var shareBtn = document.createElement('button');
    shareBtn.style.cssText = 'width:100%;margin-top:8px;padding:10px;background:rgba(52,152,219,0.15);border:1px solid rgba(52,152,219,0.3);border-radius:var(--r);color:#3498db;font-weight:700;font-size:0.78rem;cursor:pointer;';
    shareBtn.textContent = '💌 Share with a friend';
    var _meetingData = JSON.parse(JSON.stringify(m));
    shareBtn.addEventListener('click', function() { openMeetingSharePicker(_meetingData, shareBtn); });
    card.appendChild(shareBtn);
  }
  // Shared-by label for received shared favourites
  if (type === 'shared-fav' && m._sharedBy) {
    var sharedLabel = document.createElement('div');
    sharedLabel.style.cssText = 'font-size:0.65rem;color:var(--tm);margin-top:8px;font-style:italic;';
    sharedLabel.textContent = 'Shared by ' + m._sharedBy;
    card.appendChild(sharedLabel);
  }
  return card;
}
// =====================
// SHARE MEETING WITH FRIEND
// =====================
async function openMeetingSharePicker(meetingData, btn) {
  // Check if picker already exists below button
  var existing = btn.parentElement.querySelector('.share-picker');
  if (existing) { existing.remove(); return; }
  if (!supa || !currentUser) { toast('Sign in to share meetings'); return; }
  var picker = document.createElement('div');
  picker.className = 'share-picker';
  picker.style.cssText = 'background:var(--sf2);border:1px solid var(--bd);border-radius:10px;padding:12px;margin-top:8px;';
  picker.innerHTML = '<div style="font-size:0.75rem;color:var(--tm);padding:6px 0;">Loading connections...</div>';
  btn.parentElement.appendChild(picker);
  try {
    var connRes = await supa.from('connections').select('*');
    var conns = (connRes.data || []).filter(function(c) { return c.status === 'accepted' && (c.requester_id === currentUser.id || c.receiver_id === currentUser.id); });
    if (!conns.length) { picker.innerHTML = '<div style="font-size:0.75rem;color:var(--tm);padding:6px 0;">No connections yet</div>'; return; }
    var ids = conns.map(function(c) { return c.requester_id === currentUser.id ? c.receiver_id : c.requester_id; });
    var profRes = await supa.from('profiles').select('*');
    var profiles = (profRes.data || []).filter(function(p) { return ids.indexOf(p.id) > -1; });
    if (!profiles.length) { picker.innerHTML = '<div style="font-size:0.75rem;color:var(--tm);padding:6px 0;">No connections found</div>'; return; }
    var h = '<div style="font-size:0.65rem;font-weight:800;color:var(--ac);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">Share with:</div>';
    profiles.forEach(function(p) {
      var initial = (p.first_name || p.username || '?')[0].toUpperCase();
      h += '<div onclick="shareMeetingWith(\'' + p.id + '\',this)" data-meeting=\'' + JSON.stringify(meetingData).replace(/'/g, '&#39;') + '\' style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd);cursor:pointer;">';
      if (p.avatar_url) {
        h += '<img src="' + p.avatar_url + '" style="width:30px;height:30px;border-radius:50%;object-fit:cover;">';
      } else {
        h += '<div style="width:30px;height:30px;border-radius:50%;background:rgba(232,201,122,0.15);display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;color:var(--ac);">' + initial + '</div>';
      }
      h += '<div style="flex:1;font-weight:600;font-size:0.8rem;">' + (p.first_name || p.username || 'Member') + '</div>';
      h += '<div style="font-size:0.68rem;color:var(--ac);">Share ›</div></div>';
    });
    h += '<div onclick="this.parentElement.remove()" style="text-align:center;padding:8px 0;font-size:0.7rem;color:var(--tm);cursor:pointer;margin-top:4px;">Cancel</div>';
    picker.innerHTML = h;
  } catch(e) { picker.innerHTML = '<div style="font-size:0.75rem;color:var(--tm);padding:6px 0;">Could not load connections</div>'; }
}
async function shareMeetingWith(toUserId, el) {
  if (!supa || !currentUser) return;
  var meetingStr = el.getAttribute('data-meeting') || (el.closest && el.closest('[data-meeting]') ? el.closest('[data-meeting]').getAttribute('data-meeting') : null);
  if (!meetingStr) { toast('Error sharing meeting'); return; }
  var meetingData = JSON.parse(meetingStr);
  try {
    // Get sender name
    var profRes = await supa.from('profiles').select('first_name').eq('id', currentUser.id).single();
    var fromName = (profRes.data && profRes.data.first_name) || currentUser.email.split('@')[0];
    await supa.from('shared_favourites').insert({
      meeting_data: meetingData,
      from_user: currentUser.id,
      from_name: fromName,
      to_user: toUserId
    });
    toast('Meeting shared!');
    var picker = el.closest('.share-picker');
    if (picker) picker.remove();
  } catch(e) {
    console.error('Share meeting error:', e);
    toast('Could not share — try again');
  }
}
async function loadSharedFavourites() {
  if (!supa || !currentUser) return;
  var pList = document.getElementById('personal-meetings-list');
  if (!pList) return;
  try {
    var res = await supa.from('shared_favourites').select('id,meeting_data,from_name').eq('to_user', currentUser.id);
    if (res.error || !res.data || !res.data.length) return;
    // Add a header if shared favourites exist
    var sharedHdr = document.createElement('div');
    sharedHdr.style.cssText = 'font-size:0.65rem;font-weight:800;color:var(--ac);text-transform:uppercase;letter-spacing:0.06em;margin:14px 0 8px;';
    sharedHdr.textContent = '💌 Shared with you';
    pList.appendChild(sharedHdr);
    res.data.forEach(function(sf) {
      var m = sf.meeting_data;
      m._sharedBy = sf.from_name || 'A friend';
      m._sharedFavId = sf.id;
      pList.appendChild(renderMeetingCard(m, 'shared-fav'));
    });
  } catch(e) { console.error('Load shared favourites error:', e); }
}
function renderSavedMeetings() {
  // Personal meetings (localStorage)
  var pList = document.getElementById('personal-meetings-list');
  var pEmpty = document.getElementById('personal-meetings-empty');
  if (pList) {
    pList.innerHTML = '';
    if (!personalMeetings.length) {
      if (pEmpty) pEmpty.style.display = 'block';
    } else {
      if (pEmpty) pEmpty.style.display = 'none';
      personalMeetings.forEach(function(m) {
        pList.appendChild(renderMeetingCard(m, 'personal'));
      });
    }
  }
  // Shared meetings (Supabase)
  loadSharedMeetings();
  loadSharedFavourites();
  initMeetingsTab();
}
async function loadSharedMeetings() {
  var sList = document.getElementById('shared-meetings-list');
  var sEmpty = document.getElementById('shared-meetings-empty');
  if (!sList) return;
  if (!supa) { setTimeout(function() { loadSharedMeetings(); }, 1000); return; }
  // Show loading state
  sList.innerHTML = '<div style="font-size:0.76rem;color:var(--tm);text-align:center;padding:10px;">Loading...</div>';
  if (sEmpty) sEmpty.style.display = 'none';
  try {
    var result = await supa.from('shared_meetings').select('*').order('created_at', { ascending: true });
    sList.innerHTML = '';
    if (result.error) {
      console.log('Shared meetings error:', result.error);
      if (sEmpty) sEmpty.style.display = 'block';
      return;
    }
    if (!result.data || !result.data.length) {
      if (sEmpty) sEmpty.style.display = 'block';
      return;
    }
    if (sEmpty) sEmpty.style.display = 'none';
    result.data.forEach(function(m) {
      sList.appendChild(renderMeetingCard(m, 'shared'));
    });
  } catch(e) {
    console.log('Shared meetings catch:', e);
    sList.innerHTML = '';
    if (sEmpty) sEmpty.style.display = 'block';
  }
}
var selectedMeetingDays = [];
function toggleMeetingDay(btn, day) {
  if (day === 'Daily') {
    // Clear all others and select only Daily
    selectedMeetingDays = ['Daily'];
    document.querySelectorAll('#add-meeting-modal .role-btn').forEach(function(b){ b.classList.remove('selected'); });
    btn.classList.add('selected');
    return;
  }
  // Remove Daily if selecting individual days
  selectedMeetingDays = selectedMeetingDays.filter(function(d){ return d !== 'Daily'; });
  document.querySelectorAll('#add-meeting-modal .role-btn').forEach(function(b){
    if (b.textContent === 'Every Day') b.classList.remove('selected');
  });
  var idx = selectedMeetingDays.indexOf(day);
  if (idx > -1) {
    selectedMeetingDays.splice(idx, 1);
    btn.classList.remove('selected');
  } else {
    selectedMeetingDays.push(day);
    btn.classList.add('selected');
  }
}
function clearMeetingDays() {
  selectedMeetingDays = [];
  document.querySelectorAll('#add-meeting-modal .role-btn').forEach(function(b){ b.classList.remove('selected'); });
}
function setMeetingDays(daysStr) {
  clearMeetingDays();
  if (!daysStr) return;
  var days = daysStr.split(',').map(function(d){ return d.trim(); });
  days.forEach(function(day) {
    selectedMeetingDays.push(day);
    document.querySelectorAll('#add-meeting-modal .role-btn').forEach(function(b){
      if (b.textContent === day || (day === 'Daily' && b.textContent === 'Every Day')) {
        b.classList.add('selected');
      }
    });
  });
}
function openAddMeeting(type) {
  editingMeetingId = null;
  editingMeetingType = type || 'personal';
  document.getElementById('zm-name').value = '';
  document.getElementById('zm-time').value = '';
  document.getElementById('zm-id').value = '';
  document.getElementById('zm-password').value = '';
  document.getElementById('zm-url').value = '';
  document.getElementById('zm-delete-wrap').style.display = 'none';
  clearMeetingDays();
  document.getElementById('zm-modal-title').textContent = editingMeetingType === 'shared' ? 'Add Community Meeting' : 'Add to My Favourites';
  document.getElementById('zm-modal-subtitle').textContent = editingMeetingType === 'shared' ? 'Visible to everyone on the app' : 'Only visible to you';
  document.getElementById('add-meeting-modal').classList.add('open');
}
function openEditMeeting(id, type, sharedData) {
  editingMeetingType = type;
  editingMeetingId = id;
  var m;
  if (type === 'personal') {
    m = personalMeetings.find(function(x){ return x.id === id; });
  } else if (type === 'shared' && sharedData) {
    m = sharedData;
  }
  if (!m) return;
  document.getElementById('zm-name').value = m.name || '';
  // Parse days from time string
  var timeParts = (m.time || '').split(' · ');
  var daysStr = timeParts.length > 1 ? timeParts[0] : '';
  var timeOnly = timeParts.length > 1 ? timeParts[1] : m.time || '';
  document.getElementById('zm-time').value = timeOnly;
  setMeetingDays(daysStr);
  document.getElementById('zm-id').value = m.meetingId || m.meeting_id || '';
  document.getElementById('zm-password').value = m.password || '';
  document.getElementById('zm-url').value = m.url || '';
  document.getElementById('zm-delete-wrap').style.display = 'block';
  document.getElementById('zm-modal-title').textContent = 'Edit Meeting';
  document.getElementById('zm-modal-subtitle').textContent = type === 'shared' ? 'Shared with everyone - changes visible to all' : 'Your personal favourite';
  document.getElementById('add-meeting-modal').classList.add('open');
}
async function saveMeeting() {
  var name = document.getElementById('zm-name').value.trim();
  var meetingId = document.getElementById('zm-id').value.trim();
  var password = document.getElementById('zm-password').value.trim();
  var url = document.getElementById('zm-url').value.trim();
  var timeInput = document.getElementById('zm-time').value.trim();
  var time = selectedMeetingDays.length ? selectedMeetingDays.join(', ') + (timeInput ? ' · ' + timeInput : '') : timeInput;
  if (!name) { toast('Please enter a meeting name'); return; }
  if (!meetingId && !url) { toast('Please enter a Zoom ID or meeting link'); return; }
  // meetingData uses snake_case for Supabase, camelCase for localStorage
  var meetingData = { name: name, time: time, meeting_id: meetingId, password: password, url: url };
  var personalMeetingData = { name: name, time: time, meetingId: meetingId, password: password, url: url };
  if (editingMeetingType === 'shared') {
    // Save to Supabase
    if (!supa || !currentUser) { toast('Sign in to add shared meetings'); return; }
    try {
      if (editingMeetingId) {
        await supa.from('shared_meetings').update(meetingData).eq('id', editingMeetingId);
      } else {
        meetingData.created_by = currentUser.email;
        await supa.from('shared_meetings').insert(meetingData);
      }
      toast(editingMeetingId ? 'Meeting updated' : 'Meeting added for everyone');
    } catch(e) { toast('Could not save - check your connection'); return; }
  } else {
    // Save to localStorage
    if (editingMeetingId) {
      var m = personalMeetings.find(function(x){ return x.id === editingMeetingId; });
      if (m) { Object.assign(m, personalMeetingData); }
    } else {
      personalMeetingData.id = Date.now().toString();
      personalMeetings.push(personalMeetingData);
    }
    localStorage.setItem('na_personal_meetings', JSON.stringify(personalMeetings));
    toast(editingMeetingId ? 'Favourite updated' : 'Added to favourites');
  }
  closeAddMeetingDirect();
  renderSavedMeetings();
}
async function deleteMeeting() {
  if (editingMeetingType === 'shared') {
    if (!supa) return;
    try {
      await supa.from('shared_meetings').delete().eq('id', editingMeetingId);
      toast('Meeting removed');
    } catch(e) { toast('Could not delete'); return; }
  } else {
    personalMeetings = personalMeetings.filter(function(x){ return x.id !== editingMeetingId; });
    localStorage.setItem('na_personal_meetings', JSON.stringify(personalMeetings));
    toast('Removed from favourites');
  }
  closeAddMeetingDirect();
  renderSavedMeetings();
}
function closeAddMeeting(event) {
  document.getElementById('add-meeting-modal').classList.remove('open');
}
function closeAddMeetingDirect() {
  document.getElementById('add-meeting-modal').classList.remove('open');
}
// =====================
// SUPABASE SILENT SYNC
// =====================
const SUPA_URL = 'https://gencdhyxlyekpjvuwvpu.supabase.co';
const SUPA_KEY = 'sb_publishable_H79goMK6Fbf0jtRO_VpC8g_HNimPnln';
var supa = null;
var currentUser = null;
try { supa = supabase.createClient(SUPA_URL, SUPA_KEY, { global: { fetch: (...args) => fetch(...args) } }); } catch(e) {}
async function pushToCloud() {
  if (!supa || !currentUser) return;
  try {
    await supa.from('user_data').upsert({
      user_id: currentUser.id,
      clean_date: cleanDate,
      mood_log: moodLog,
      journal: journalEntries,
      network: networkContacts,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
  } catch(e) {}
}
async function pullFromCloud() {
  if (!supa || !currentUser) return;
  try {
    var result = await supa.from('user_data').select('*').eq('user_id', currentUser.id).single();
    var data = result.data;
    if (data) {
      if (data.clean_date) { cleanDate = data.clean_date; localStorage.setItem('na_clean_date', cleanDate); updateDaysCount(); }
      if (data.mood_log && data.mood_log.length) { moodLog = data.mood_log; localStorage.setItem('na_mood_log', JSON.stringify(moodLog)); markTodayMood(); renderMoodHistory(); }
      if (data.journal && data.journal.length) { journalEntries = data.journal; localStorage.setItem('na_journal', JSON.stringify(journalEntries)); renderJournalEntries(); }
    }
  } catch(e) {}
  try {
    var profRes = await supa.from('profiles').select('*').eq('id', currentUser.id).single();
    if (profRes.data) {
      var p = profRes.data;
      var profile = { username: p.username||'', country: p.country||'', location: p.location||'', cleandate: p.clean_date||'', instagram: p.instagram||'', whatsapp: p.whatsapp||'', facebook: p.facebook||'' };
      localStorage.setItem('cl_profile', JSON.stringify(profile));
      if (profile.cleandate) { cleanDate = profile.cleandate; localStorage.setItem('na_clean_date', cleanDate); updateDaysCount(); setTimeout(function(){ checkMilestoneCelebration(cleanDate); }, 2000); }
      var sf = function(id,val){ var el=document.getElementById(id); if(el&&val) el.value=val; };
      sf('profile-username', profile.username); sf('profile-country', profile.country);
      sf('profile-location', profile.location); sf('profile-cleandate', profile.cleandate);
      sf('profile-instagram', profile.instagram); sf('profile-whatsapp', profile.whatsapp);
      sf('profile-facebook', profile.facebook);
      if (profile.username) { var nm=document.getElementById('account-name'); if(nm) nm.textContent=profile.username; var av=document.getElementById('account-avatar-letter'); if(av) av.textContent=profile.username[0].toUpperCase(); }
      myProfile = p;
    }
  } catch(e) { console.log('Profile pull error:', e); }
}
// On load - wrapped in DOMContentLoaded so all functions exist first
document.addEventListener('DOMContentLoaded', function() {
  // iOS PWA fix for bulk import button
  var _bulkBtn = document.getElementById('bulk-import-btn');
  if (_bulkBtn) {
    _bulkBtn.removeAttribute('onclick');
    _bulkBtn.addEventListener('click', function(e) { e.preventDefault(); bulkImportEvents(); }, {passive: false});
    _bulkBtn.addEventListener('touchend', function(e) { e.preventDefault(); bulkImportEvents(); }, {passive: false});
  }
  // Check session - show welcome if not signed in, go straight to app if signed in
  if (supa) {
    supa.auth.getSession().then(function(r) {
      if (r && r.data && r.data.session && r.data.session.user && r.data.session.user.email) {
        // Already signed in - go straight to app
        currentUser = r.data.session.user;
        pullFromCloud();
        updateSigninBtn();
        updateAvatarDisplay();
        // Show signout button
        var outBtn = document.getElementById('home-signout-btn');
        if (outBtn) outBtn.style.display = 'block';
        // Delayed milestone check — give Supabase time to load clean date
        setTimeout(function() {
          if (cleanDate) checkMilestoneCelebration(cleanDate);
        }, 3500);
        updateLastSeen();
        setInterval(updateLastSeen, 3 * 60 * 1000);
        // Re-render events now that currentUser is known, so Going buttons show correctly
        if (allEvents && allEvents.length) renderEvents();
        setTimeout(function() { checkTrialStatus(); checkPendingBadge(); loadHomeCalendar(); loadEventSuggestions(); loadSocialEvents(); checkConnectionRequests(); var an=document.getElementById('nav-admin'); if(an) an.style.display=isAdmin()?'':'none'; checkOverdueSources(); var aeb=document.getElementById('admin-events-btn'); if(aeb) aeb.style.display=isAdmin()?'inline':'none'; var apb=document.getElementById('admin-past-btn'); if(apb) apb.style.display=isAdmin()?'inline':'none'; }, 1500);
        // Smart retries for home events only - stop as soon as they load
        var _homeRetries = [4000, 8000, 15000];
        _homeRetries.forEach(function(delay) {
          setTimeout(function() {
            var wrap = document.getElementById('home-upcoming-events');
            if (!allEvents || !allEvents.length) { loadHomeCalendar(); }
            if (!window._socialEvents || !window._socialEvents.length) { loadSocialEvents(); }
          }, delay);
        });
        // Retry home calendar multiple times to catch slow connections
        initHomeScreen();
        // app is already visible, welcome screen is hidden
      } else {
        // Not signed in - show welcome screen
        showWelcomeScreen();
        initHomeScreen();
      }
    }).catch(function(){
      // Can't reach Supabase - show app anyway
      console.log('Session check failed - showing app');
      initHomeScreen();
    });
  } else {
    showWelcomeScreen();
  }
});
var _origSaveCleanDate = saveCleanDate; saveCleanDate = function() { _origSaveCleanDate.apply(this,arguments); pushToCloud(); };
var _origSaveJournal = saveJournal; saveJournal = function() { _origSaveJournal.apply(this,arguments); pushToCloud(); };
// contact functions removed with old network tab
var _origDeleteJournal = deleteJournal; deleteJournal = function(id) { _origDeleteJournal(id); pushToCloud(); };
var _origSetMood = setMood; setMood = function(m) { _origSetMood(m); pushToCloud(); };
// =====================
// MY EVENTS SCREEN
// =====================
function renderMyEvents() {
  var list = document.getElementById('my-events-list');
  if (!list) return;
  while (list.firstChild) list.removeChild(list.firstChild);
  if (!currentUser) {
    list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--tm);">Sign in to see your events</div>';
    return;
  }
  function doRender(events) {
    var userId = currentUser.id;
    var today = new Date(); today.setHours(0,0,0,0);
    var myEvents = events.filter(function(ev) {
      return ev.going_users && ev.going_users.indexOf(userId) > -1;
    });
    while (list.firstChild) list.removeChild(list.firstChild);
    if (!myEvents.length) {
      var emptyDiv = document.createElement('div');
      emptyDiv.style.cssText = 'text-align:center;padding:50px 20px;';
      var icon = document.createElement('div');
      icon.style.cssText = 'font-size:3rem;margin-bottom:12px;';
      icon.textContent = '📅';
      var msg = document.createElement('div');
      msg.style.cssText = 'font-size:0.88rem;color:var(--tm);margin-bottom:16px;';
      msg.textContent = "You haven't marked any events as going yet";
      var btn = document.createElement('button');
      btn.style.cssText = 'padding:11px 22px;background:var(--ac);border:none;border-radius:var(--r);color:#1a1208;font-weight:700;cursor:pointer;';
      btn.textContent = 'Browse Events';
      btn.onclick = function(){ showScreen('events'); };
      emptyDiv.appendChild(icon);
      emptyDiv.appendChild(msg);
      emptyDiv.appendChild(btn);
      list.appendChild(emptyDiv);
      return;
    }
    var upcoming = myEvents.filter(function(ev){ return new Date(ev.date) >= today; });
    var past = myEvents.filter(function(ev){ return new Date(ev.date) < today; });
    function buildCard(ev) {
      var d = new Date(ev.date);
      var isPast = d < today;
      var card = document.createElement('div');
      card.style.cssText = 'background:var(--sf);border:1px solid ' + (isPast ? 'var(--bd)' : 'rgba(232,201,122,0.35)') + ';border-radius:var(--r);padding:14px;margin-bottom:10px;display:flex;gap:12px;opacity:' + (isPast ? '0.55' : '1') + ';cursor:pointer;';
      card.addEventListener('click', (function(event) { return function() { openEventDetail(event); }; })(ev));
      var dateBadge = document.createElement('div');
      dateBadge.style.cssText = 'flex-shrink:0;width:46px;text-align:center;background:rgba(232,201,122,0.1);border:1px solid rgba(232,201,122,0.25);border-radius:10px;padding:8px 4px;';
      var dayEl = document.createElement('div');
      dayEl.style.cssText = 'font-size:1.2rem;font-weight:800;color:var(--ac);line-height:1;';
      dayEl.textContent = d.getDate();
      var monEl = document.createElement('div');
      monEl.style.cssText = 'font-size:0.58rem;text-transform:uppercase;color:var(--tm);margin-top:2px;';
      monEl.textContent = d.toLocaleDateString('en-GB',{month:'short'});
      var yrEl = document.createElement('div');
      yrEl.style.cssText = 'font-size:0.58rem;color:var(--tm);';
      yrEl.textContent = d.getFullYear();
      dateBadge.appendChild(dayEl);
      dateBadge.appendChild(monEl);
      dateBadge.appendChild(yrEl);
      card.appendChild(dateBadge);
      var info = document.createElement('div');
      info.style.cssText = 'flex:1;min-width:0;';
      var nameEl = document.createElement('div');
      nameEl.style.cssText = 'font-weight:700;font-size:0.88rem;margin-bottom:3px;';
      nameEl.textContent = ev.name;
      var locEl = document.createElement('div');
      locEl.style.cssText = 'font-size:0.72rem;color:var(--tm);margin-bottom:8px;';
      locEl.textContent = '📍 ' + (ev.location || '') + (ev.country ? ', ' + ev.country : '');
      var goingEl = document.createElement('div');
      var gc = ev.going_users ? ev.going_users.length : 0;
      goingEl.style.cssText = 'font-size:0.68rem;color:var(--ac);margin-bottom:8px;';
      goingEl.textContent = gc ? '👥 ' + gc + ' going · Tap for details' : 'Tap for details';
      var removeBtn = document.createElement('button');
      removeBtn.style.cssText = 'font-size:0.68rem;color:var(--tm);background:transparent;border:1px solid var(--bd);border-radius:20px;padding:3px 10px;cursor:pointer;';
      removeBtn.textContent = '✕ Remove';
      removeBtn.onclick = function(e) {
        e.stopPropagation();
        toggleGoing(e, ev.id);
        setTimeout(function(){ renderMyEvents(); loadHomeCalendar(); }, 600);
      };
      info.appendChild(nameEl);
      info.appendChild(locEl);
      info.appendChild(goingEl);
      info.appendChild(removeBtn);
      card.appendChild(info);
      return card;
    }
    function addSection(title, evList) {
      var hdr = document.createElement('div');
      hdr.style.cssText = 'font-size:0.65rem;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:var(--ac);margin:16px 0 10px;';
      hdr.textContent = title;
      list.appendChild(hdr);
      var grouped = {};
      evList.forEach(function(ev) {
        var key = new Date(ev.date).toLocaleDateString('en-GB',{month:'long',year:'numeric'});
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(ev);
      });
      Object.keys(grouped).forEach(function(month) {
        var mh = document.createElement('div');
        mh.style.cssText = 'font-size:0.72rem;color:var(--tm);margin:10px 0 6px;padding-bottom:4px;border-bottom:1px solid var(--bd);';
        mh.textContent = month;
        list.appendChild(mh);
        grouped[month].forEach(function(ev){ list.appendChild(buildCard(ev)); });
      });
    }
    if (upcoming.length) addSection('Upcoming · ' + upcoming.length + ' event' + (upcoming.length !== 1 ? 's' : ''), upcoming);
    if (past.length) addSection('Past events', past);
  }
  if (allEvents && allEvents.length) {
    doRender(allEvents);
  } else if (supa) {
    list.innerHTML = '<div style="text-align:center;padding:30px;color:var(--tm);">Loading...</div>';
    supa.from('events').select('*').eq('approved',true).order('date',{ascending:true}).then(function(r){
      if (r.data) { allEvents = r.data; }
      doRender(allEvents || []);
    });
  }
}
// =====================
// EVENT SOURCES
// =====================
async function loadEventSources() {
  if (!supa || !isAdmin()) return;
  var list = document.getElementById('sources-list');
  if (!list) return;
  while (list.firstChild) list.removeChild(list.firstChild);
  var res = await supa.from('event_sources').select('id,url,label,last_imported,created_at').order('created_at', { ascending: true });
  var sources = res.data || [];
  if (!sources.length) {
    var empty = document.createElement('div');
    empty.style.cssText = 'font-size:0.72rem;color:var(--tm);margin-bottom:6px;';
    empty.textContent = 'No saved sources yet - add one below';
    list.appendChild(empty);
    return;
  }
  sources.forEach(function(src) {
    var row = document.createElement('div');
    row.style.cssText = 'background:var(--sf2);border:1px solid var(--bd);border-radius:10px;padding:10px 12px;margin-bottom:8px;';
    var top = document.createElement('div');
    top.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:6px;';
    var label = document.createElement('div');
    label.style.cssText = 'flex:1;font-size:0.82rem;font-weight:700;';
    label.textContent = src.label || src.url;
    top.appendChild(label);
    var deleteBtn = document.createElement('button');
    deleteBtn.style.cssText = 'font-size:0.65rem;color:#e74c3c;background:transparent;border:1px solid rgba(231,76,60,0.3);border-radius:20px;padding:3px 8px;cursor:pointer;';
    deleteBtn.textContent = '✕';
    deleteBtn.onclick = async function() {
      if (confirm('Remove this source?')) {
        await supa.from('event_sources').delete().eq('id', src.id);
        loadEventSources();
      }
    };
    top.appendChild(deleteBtn);
    row.appendChild(top);
    var urlEl = document.createElement('div');
    urlEl.style.cssText = 'font-size:0.65rem;color:var(--tm);margin-bottom:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    urlEl.textContent = src.url;
    row.appendChild(urlEl);
    var lastSync = document.createElement('div');
    lastSync.style.cssText = 'font-size:0.65rem;color:var(--tm);margin-bottom:8px;';
    lastSync.textContent = src.last_synced
      ? 'Last synced: ' + new Date(src.last_synced).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
      : 'Never synced';
    row.appendChild(lastSync);
    var syncBtn = document.createElement('button');
    syncBtn.style.cssText = 'width:100%;padding:8px;background:var(--ac);border:none;border-radius:8px;color:#1a1208;font-weight:700;font-size:0.75rem;cursor:pointer;';
    syncBtn.textContent = '🔄 Sync Now';
    syncBtn.onclick = function() {
      document.getElementById('bulk-import-url').value = src.url;
      bulkImportEvents(src.id);
    };
    row.appendChild(syncBtn);
    list.appendChild(row);
  });
}
async function addEventSource() {
  var url = (document.getElementById('bulk-import-url').value || '').trim();
  var label = (document.getElementById('bulk-import-label').value || '').trim();
  if (!url) { toast('Please enter a URL first'); return; }
  if (!url.startsWith('http')) url = 'https://' + url;
  var res = await supa.from('event_sources').insert({ url: url, label: label || null });
  if (res.error) {
    if (res.error.code === '23505') {
      toast('This URL is already saved');
    } else {
      toast('Could not save: ' + res.error.message);
    }
    return;
  }
  document.getElementById('bulk-import-label').value = '';
  toast('Source saved! ✓');
  loadEventSources();
}
// =====================
// BULK EVENT IMPORT
// =====================
function setBulkMode(mode) {
  var urlTab = document.getElementById('bulk-tab-url');
  var textTab = document.getElementById('bulk-tab-text');
  var flyersTab = document.getElementById('bulk-tab-flyers');
  var urlDiv = document.getElementById('bulk-mode-url');
  var textDiv = document.getElementById('bulk-mode-text');
  var flyersDiv = document.getElementById('bulk-mode-flyers');
  // Reset all
  [urlTab, textTab, flyersTab].forEach(function(t) {
    if (t) { t.style.background = 'transparent'; t.style.color = 'var(--ac)'; t.style.border = '1px solid rgba(232,201,122,0.4)'; }
  });
  [urlDiv, textDiv, flyersDiv].forEach(function(d) { if (d) d.style.display = 'none'; });
  // Activate selected
  if (mode === 'url') {
    if (urlDiv) urlDiv.style.display = '';
    if (urlTab) { urlTab.style.background = 'var(--ac)'; urlTab.style.color = '#1a1208'; urlTab.style.border = '1px solid var(--ac)'; }
  } else if (mode === 'text') {
    if (textDiv) textDiv.style.display = '';
    if (textTab) { textTab.style.background = 'var(--ac)'; textTab.style.color = '#1a1208'; textTab.style.border = '1px solid var(--ac)'; }
  } else if (mode === 'flyers') {
    if (flyersDiv) flyersDiv.style.display = '';
    if (flyersTab) { flyersTab.style.background = 'var(--ac)'; flyersTab.style.color = '#1a1208'; flyersTab.style.border = '1px solid var(--ac)'; }
  }
}

function previewBulkFlyers(input) {
  var files = Array.from(input.files);
  if (!files.length) return;
  var countEl = document.getElementById('bulk-flyer-count');
  var thumbsEl = document.getElementById('bulk-flyer-thumbs');
  var previewEl = document.getElementById('bulk-flyer-preview');
  if (countEl) countEl.textContent = files.length + ' flyer' + (files.length > 1 ? 's' : '') + ' selected';
  if (thumbsEl) {
    thumbsEl.innerHTML = '';
    files.forEach(function(file) {
      var reader = new FileReader();
      reader.onload = function(e) {
        var img = document.createElement('img');
        img.src = e.target.result;
        img.style.cssText = 'width:56px;height:56px;object-fit:cover;border-radius:6px;border:1px solid rgba(232,201,122,0.3);';
        thumbsEl.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  }
  if (previewEl) previewEl.style.display = '';
}

async function bulkImportEvents() {
  var urlEl = document.getElementById('bulk-import-url');
  var btn = document.getElementById('bulk-import-btn');
  var status = document.getElementById('bulk-import-status');
  // Detect which mode we're in
  var textEl = document.getElementById('bulk-import-text');
  var flyerInput = document.getElementById('bulk-flyer-input');
  var textMode = document.getElementById('bulk-mode-text') && document.getElementById('bulk-mode-text').style.display !== 'none';
  var flyersMode = document.getElementById('bulk-mode-flyers') && document.getElementById('bulk-mode-flyers').style.display !== 'none';
  var url = urlEl ? urlEl.value.trim() : '';
  var pastedText = textEl ? textEl.value.trim() : '';
  var plainText = '';

  // FLYERS MODE — process multiple images one by one
  if (flyersMode) {
    var files = flyerInput ? Array.from(flyerInput.files) : [];
    if (!files.length) { toast('Please select at least one flyer photo'); return; }
    btn.textContent = 'Reading flyers...';
    btn.disabled = true;
    status.style.display = 'block';
    var imported = 0;
    var failed = 0;
    for (var fi = 0; fi < files.length; fi++) {
      var fFile = files[fi];
      status.textContent = '📸 Reading flyer ' + (fi + 1) + ' of ' + files.length + '...';
      try {
        var base64 = await new Promise(function(resolve, reject) {
          var r = new FileReader();
          r.onload = function(e) { resolve(e.target.result.split(',')[1]); };
          r.onerror = reject;
          r.readAsDataURL(fFile);
        });
        var mediaType = fFile.type || 'image/jpeg';
        var aiRes = await fetch(AI_PROXY, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 800,
            system: 'Extract event details from flyer images. Respond ONLY with valid JSON. Fields: name, date (YYYY-MM-DD), end_date (YYYY-MM-DD or null), location, country (full country name), url, description (max 150 chars), type (Convention/Marathon/Speaker Meeting/Workshop/Other). Use null for unknown fields.',
            messages: [{ role: 'user', content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 }},
              { type: 'text', text: 'Extract all event details from this flyer. Return JSON only.' }
            ]}]
          })
        });
        var aiData = await aiRes.json();
        if (aiData.error) { failed++; continue; }
        var raw = ((aiData.content[0] || {}).text || '').replace(/```json|```/g, '').trim();
        var ev = JSON.parse(raw);
        if (ev.name && ev.date) {
          var row = {
            name: ev.name, date: ev.date, end_date: ev.end_date || null,
            location: ev.location || 'TBC', country: ev.country || 'Other',
            type: ev.type || 'Other', description: ev.description || null,
            url: ev.url || null, approved: false,
            submitted_by: 'bulk-flyer-import',
            going_users: [], going_names: []
          };
          var saveRes = await supa.from('events').insert([row]);
          if (!saveRes.error) imported++; else failed++;
        } else { failed++; }
      } catch(e) { failed++; }
    }
    var msg = '✅ ' + imported + ' event' + (imported !== 1 ? 's' : '') + ' imported from flyers';
    if (failed) msg += ' (' + failed + ' could not be read)';
    status.textContent = msg;
    btn.textContent = '🤖 Import Events with AI';
    btn.disabled = false;
    if (flyerInput) flyerInput.value = '';
    document.getElementById('bulk-flyer-preview').style.display = 'none';
    if (imported > 0) openAdminPanel();
    return;
  }

  if (textMode) {
    // Text paste mode — use directly
    if (!pastedText) { toast('Please paste some text from the events page'); return; }
    plainText = pastedText.replace(/\s+/g, ' ').trim().substring(0, 12000);
    btn.textContent = 'Reading text...';
    btn.disabled = true;
    status.style.display = 'block';
    status.textContent = 'Step 1/2 - AI is reading the pasted text...';
  } else {
    // URL mode — fetch via proxy
    if (!url) { toast('Please enter a URL'); return; }
    if (!url.startsWith('http')) { toast('Please enter a full URL starting with https://'); return; }
    btn.textContent = 'Fetching page...';
    btn.disabled = true;
    status.style.display = 'block';
    status.textContent = 'Step 1/3 - Fetching page content...';
    try {
      // Fetch via our own Worker to avoid CORS issues
      status.textContent = 'Step 1/3 - Fetching page...';
      var html = '';
      var fetchSuccess = false;
      try {
        var pageRes = await fetch(AI_PROXY, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fetchUrl: url })
        });
        if (pageRes.ok) {
          var pageData = await pageRes.json();
          html = pageData.html || '';
          if (html && html.length > 200) fetchSuccess = true;
        }
      } catch(proxyErr) {}
      if (!fetchSuccess || !html) throw new Error('Could not fetch the page — try the Paste Text option instead');
      plainText = html
        .replace(new RegExp('<sty'+'le[^>]*>[\s\S]*?<\/sty'+'le>', 'gi'), '')
        .replace(new RegExp('<scr'+'ipt[^>]*>[\s\S]*?<\/scr'+'ipt>', 'gi'), '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 12000);
    } catch(fetchErr) {
      status.textContent = '❌ ' + (fetchErr.message || 'Could not fetch page');
      btn.textContent = '🤖 Import Events with AI';
      btn.disabled = false;
      return;
    }
    status.textContent = 'Step 2/3 - AI is reading the page...';
  }
  try {
    // Send to AI
    var aiRes = await fetch(AI_PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: 'Extract ALL events from this webpage text. Return ONLY a valid JSON array, no markdown, no explanation, no code blocks. Each event object must have: name (string), date (YYYY-MM-DD format), end_date (YYYY-MM-DD or null), location (city/venue), country (full country name), type (Convention/Workshop/Meeting/Conference/Retreat/Festival/Marathon/Other), description (brief summary or null), url (event link or null). Skip any items that are not events. If no events found return empty array []. Page text: ' + plainText
        }]
      })
    });
    var aiData = await aiRes.json();
    if (aiData.error) throw new Error('AI: ' + aiData.error.message);
    var raw = (aiData.content[0].text || '').trim();
    raw = raw.replace(/^```[a-z]*\n?/,'').replace(/\n?```$/,'').trim();
    var events;
    try { events = JSON.parse(raw); }
    catch(e) { throw new Error('AI returned unexpected format - try a different page'); }
    if (!Array.isArray(events)) throw new Error('No event list returned');
    var valid = events.filter(function(ev){ return ev.name && ev.date; });
    if (!valid.length) throw new Error('No events with dates found on this page');
    // DUPLICATE DETECTION — check against existing events
    status.textContent = textMode ? 'Step 2/2 - Checking for duplicates...' : 'Step 3/3 - Checking for duplicates...';
    var existingRes = await supa.from('events').select('name,date');
    var existingEvents = (existingRes.data || []);
    var existingSet = {};
    existingEvents.forEach(function(e) {
      var key = (e.name || '').toLowerCase().replace(/\s+/g,' ').trim() + '|' + (e.date || '');
      existingSet[key] = true;
    });
    var newEvents = [];
    var dupeCount = 0;
    valid.forEach(function(ev) {
      var key = (ev.name || '').toLowerCase().replace(/\s+/g,' ').trim() + '|' + (ev.date || '');
      if (existingSet[key]) { dupeCount++; }
      else { newEvents.push(ev); }
    });
    if (!newEvents.length) {
      status.textContent = '✅ All ' + valid.length + ' events already exist — nothing new to import.';
      btn.textContent = '🤖 Import Events with AI';
      btn.disabled = false;
      return;
    }
    status.textContent = '⏳ Saving ' + newEvents.length + ' new events (' + dupeCount + ' duplicates skipped)...';
    var rows = newEvents.map(function(ev) {
      return {
        name: ev.name,
        date: ev.date,
        end_date: ev.end_date || null,
        location: ev.location || 'TBC',
        country: ev.country || 'Other',
        type: ev.type || 'Other',
        description: ev.description || null,
        url: ev.url || url,
        approved: false,
        submitted_by: 'bulk-import: ' + (url || 'pasted text'),
        going_users: [],
        going_names: []
      };
    });
    // Insert in batches of 10
    var batchSize = 10;
    var saved = 0;
    for (var i = 0; i < rows.length; i += batchSize) {
      var batch = rows.slice(i, i + batchSize);
      status.textContent = '⏳ Saving ' + Math.min(i + batchSize, rows.length) + ' of ' + rows.length + '...';
      var bRes = await supa.from('events').insert(batch);
      if (bRes.error) throw new Error('Save failed: ' + bRes.error.message);
      saved += batch.length;
    }
    var msg = '✅ ' + newEvents.length + ' new event' + (newEvents.length !== 1 ? 's' : '') + ' imported!';
    if (dupeCount) msg += ' (' + dupeCount + ' duplicate' + (dupeCount !== 1 ? 's' : '') + ' skipped)';
    status.textContent = msg;
    btn.textContent = '🤖 Import Events with AI';
    btn.disabled = false;
    urlEl.value = '';
    if (textEl) textEl.value = '';
    openAdminPanel(); // refresh pending list
  } catch(err) {
    status.textContent = '❌ ' + (err.message || 'Import failed');
    btn.textContent = '🤖 Import Events with AI';
    btn.disabled = false;
  }
}
// =====================
// DUPLICATE REMOVAL
// =====================
async function findAndRemoveDuplicates() {
  var btn = document.getElementById('dedupe-btn');
  var status = document.getElementById('dedupe-status');
  var list = document.getElementById('dedupe-list');
  btn.disabled = true;
  btn.textContent = '⏳ Scanning...';
  status.style.display = 'block';
  status.textContent = 'Loading all events...';
  status.style.background = '#2a2410';
  status.style.color = '#e8c97a';
  status.style.border = '2px solid #e8c97a';
  while (list.firstChild) list.removeChild(list.firstChild);
  try {
    var res = await supa.from('events').select('id, name, date, location, approved').order('created_at', { ascending: true });
    var events = res.data || [];
    var groups = {};
    events.forEach(function(ev) {
      var key = ev.name.toLowerCase().trim() + '|' + ev.date;
      if (!groups[key]) groups[key] = [];
      groups[key].push(ev);
    });
    var dupeGroups = Object.keys(groups).filter(function(k){ return groups[k].length > 1; });
    if (!dupeGroups.length) {
      status.textContent = '✅ No duplicates found - all clean!';
      btn.textContent = '🔍 Find & Remove Duplicates';
      btn.disabled = false;
      return;
    }
    var toRemoveIds = [];
    dupeGroups.forEach(function(key) {
      var group = groups[key];
      var keep = group[0];
      var remove = group.slice(1);
      remove.forEach(function(ev){ toRemoveIds.push(ev.id); });
      var card = document.createElement('div');
      card.style.cssText = 'background:var(--sf2);border:1px solid var(--bd);border-radius:10px;padding:10px;margin-bottom:8px;font-size:0.75rem;';
      var nameEl = document.createElement('div');
      nameEl.style.cssText = 'font-weight:700;margin-bottom:4px;';
      nameEl.textContent = keep.name;
      var dateEl = document.createElement('div');
      dateEl.style.cssText = 'color:var(--tm);margin-bottom:4px;';
      dateEl.textContent = new Date(keep.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
      var dupEl = document.createElement('div');
      dupEl.style.cssText = 'color:#e74c3c;';
      dupEl.textContent = remove.length + ' duplicate' + (remove.length > 1 ? 's' : '') + ' will be removed';
      card.appendChild(nameEl);
      card.appendChild(dateEl);
      card.appendChild(dupEl);
      list.appendChild(card);
    });
    status.textContent = 'Found ' + toRemoveIds.length + ' duplicates across ' + dupeGroups.length + ' events';
    var removeBtn = document.createElement('button');
    removeBtn.style.cssText = 'width:100%;padding:12px;background:#e74c3c;border:none;border-radius:var(--r);color:#fff;font-weight:700;cursor:pointer;font-size:0.85rem;margin-top:8px;';
    removeBtn.textContent = '🗑️ Remove All ' + toRemoveIds.length + ' Duplicates';
    removeBtn.onclick = async function() {
      removeBtn.disabled = true;
      removeBtn.textContent = '⏳ Removing...';
      var batchSize = 20;
      for (var i = 0; i < toRemoveIds.length; i += batchSize) {
        await supa.from('events').delete().in('id', toRemoveIds.slice(i, i + batchSize));
      }
      status.textContent = '✅ Removed ' + toRemoveIds.length + ' duplicates!';
      while (list.firstChild) list.removeChild(list.firstChild);
      btn.textContent = '🔍 Find & Remove Duplicates';
      btn.disabled = false;
      loadEvents();
    };
    list.appendChild(removeBtn);
    btn.textContent = '🔍 Find & Remove Duplicates';
    btn.disabled = false;
  } catch(e) {
    status.textContent = '❌ Error: ' + e.message;
    status.style.background = '#3a0a0a';
    status.style.color = '#ff6b6b';
    status.style.border = '2px solid #e74c3c';
    btn.textContent = '🔍 Find & Remove Duplicates';
    btn.disabled = false;
  }
}


var currentNetTab = 'discover';
var netProfiles = [];
var netConnections = [];
var netPendingRequests = [];
var myProfile = null;
async function loadNetwork() {
  if (!currentUser) return;
  await loadMyProfile();
  switchNetTab('discover');
  checkConnectionRequests();
}
async function loadMyProfile() {
  if (!supa || !currentUser) return;
  var res = await supa.from('profiles').select('*').eq('id', currentUser.id).single();
  myProfile = (res.data) ? res.data : null;
}

function toggleOnlineFilter() {
  netOnlineOnly = !netOnlineOnly;
  var btn = document.getElementById('net-online-filter');
  if (btn) {
    btn.style.background = netOnlineOnly ? 'rgba(46,204,113,0.2)' : 'transparent';
    btn.style.color = netOnlineOnly ? '#2ecc71' : 'var(--tm)';
    btn.style.borderColor = netOnlineOnly ? 'rgba(46,204,113,0.5)' : 'var(--bd)';
  }
  filterNetContent();
}

function filterNetContent() {
  var term = document.getElementById('net-search') ? document.getElementById('net-search').value.trim() : '';
  renderDiscover(term);
}

function switchNetTab(tab) {
  currentNetTab = tab;
  ['discover','connections','requests'].forEach(function(t) {
    var btn = document.getElementById('net-tab-' + t);
    if (!btn) return;
    if (t === tab) {
      btn.style.background = 'var(--ac)';
      btn.style.color = '#1a1208';
      btn.style.border = 'none';
      btn.style.fontWeight = '700';
    } else {
      btn.style.background = 'transparent';
      btn.style.color = 'var(--tm)';
      btn.style.border = '1px solid var(--bd)';
      btn.style.fontWeight = '400';
    }
  });
  var searchWrap = document.getElementById('net-search-wrap');
  if (searchWrap) searchWrap.style.display = tab === 'discover' ? 'block' : 'none';
  var searchEl = document.getElementById('net-search');
  if (searchEl) searchEl.value = '';
  if (tab === 'discover') renderDiscover();
  if (tab === 'connections') renderConnections();
  if (tab === 'requests') renderRequests();
}
var netDiscoverProfiles = [];
var netOnlineOnly = false;
var netDiscoverConns = [];
async function renderDiscover(searchTerm) {
  var c = document.getElementById('net-content');
  if (!searchTerm) {
    c.innerHTML = '<div style="text-align:center;padding:20px;color:var(--tm);">Loading members...</div>';
  }
  if (!supa) { c.innerHTML = '<div style="text-align:center;padding:20px;color:var(--tm);">Connection error — please try again</div>'; return; }
  try {
    if (!searchTerm || !netDiscoverProfiles.length) {
      var res = await supa.from('profiles').select('*').neq('id', currentUser.id);
      if (res.error) throw res.error;
      netDiscoverProfiles = res.data || [];
      var connRes = await supa.from('connections').select('*');
      netDiscoverConns = (connRes.data || []).filter(function(cn) { return cn.requester_id === currentUser.id || cn.receiver_id === currentUser.id; });
    }
  var profiles = netDiscoverProfiles;
  if (searchTerm) {
    var term = searchTerm.toLowerCase();
    profiles = profiles.filter(function(p) {
      return (p.username || '').toLowerCase().includes(term) ||
             (p.location || '').toLowerCase().includes(term);
    });
  }
  if (netOnlineOnly) {
    profiles = profiles.filter(function(p) {
      return p.last_seen && (Date.now() - new Date(p.last_seen).getTime()) < 5 * 60 * 1000;
    });
  }
  var conns = netDiscoverConns;
  // connections loaded above
  c.innerHTML = '';
  if (!profiles.length) {
    var emptyMsg = netOnlineOnly ? 'No members online right now — check back later' : 'No other members yet - invite your friends!';
    c.innerHTML = '<div style="text-align:center;padding:40px;color:var(--tm);font-size:0.85rem;">' + emptyMsg + '</div>';
    return;
  }
  profiles.forEach(function(p) {
    var conn = conns.find(function(c) {
      return (c.requester_id === currentUser.id && c.receiver_id === p.id) ||
             (c.receiver_id === currentUser.id && c.requester_id === p.id);
    });
    var status = conn ? conn.status : null;
    var iRequested = conn && conn.requester_id === currentUser.id;
    var card = document.createElement('div');
    card.style.cssText = 'background:var(--sf);border:1px solid var(--bd);border-radius:var(--r);padding:14px 16px;margin-bottom:10px;display:flex;align-items:center;gap:12px;';
    // Avatar with online dot and photo support
    var avWrap = document.createElement('div');
    avWrap.style.cssText = 'position:relative;flex-shrink:0;';
    var av = document.createElement('div');
    av.style.cssText = 'width:44px;height:44px;border-radius:50%;background:rgba(232,201,122,0.15);border:1px solid rgba(232,201,122,0.3);display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:700;color:var(--ac);overflow:hidden;cursor:pointer;';
    if (p.avatar_url) {
      av.innerHTML = '<img src="'+p.avatar_url+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onclick="showAvatarLightbox(\''+p.avatar_url+'\')">';
    } else {
      av.textContent = (p.username || '?')[0].toUpperCase();
    }
    // Online dot — green if last_seen within 5 minutes
    var isOnline = p.last_seen && (Date.now() - new Date(p.last_seen).getTime()) < 5 * 60 * 1000;
    var dot = document.createElement('div');
    dot.style.cssText = 'position:absolute;bottom:1px;right:1px;width:10px;height:10px;border-radius:50%;background:'+(isOnline?'#2ecc71':'#555')+';border:2px solid var(--sf);';
    avWrap.appendChild(av);
    avWrap.appendChild(dot);
    card.appendChild(avWrap);
    // Info
    var info = document.createElement('div');
    info.style.cssText = 'flex:1;min-width:0;';
    var name = document.createElement('div');
    name.style.cssText = 'font-weight:700;font-size:0.88rem;';
    name.textContent = p.username || 'Member';
    info.appendChild(name);
    var locationStr = [p.location, p.country].filter(Boolean).join(', ');
    if (locationStr) {
      var loc = document.createElement('div');
      loc.style.cssText = 'font-size:0.72rem;color:var(--tm);margin-top:2px;';
      loc.textContent = locationStr;
      info.appendChild(loc);
    }
    // If connected - show socials
    if (status === 'accepted') {
      var socials = document.createElement('div');
      socials.style.cssText = 'display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;';
      if (p.instagram) {
        var ig = document.createElement('a');
        ig.href = 'https://instagram.com/' + p.instagram.replace('@','');
        ig.target = '_blank';
        ig.style.cssText = 'font-size:0.65rem;padding:3px 8px;background:rgba(232,201,122,0.1);border:1px solid rgba(232,201,122,0.25);border-radius:20px;color:var(--ac);text-decoration:none;';
        ig.textContent = '📸 Instagram';
        socials.appendChild(ig);
      }
      if (p.whatsapp) {
        var wa = document.createElement('a');
        wa.href = formatWhatsAppLink(p.whatsapp, p.country);
        wa.target = '_blank';
        wa.style.cssText = 'font-size:0.65rem;padding:3px 8px;background:rgba(37,211,102,0.1);border:1px solid rgba(37,211,102,0.25);border-radius:20px;color:#25d366;text-decoration:none;';
        wa.textContent = '💬 WhatsApp';
        socials.appendChild(wa);
      }
      if (p.facebook) {
        var fb = document.createElement('a');
        fb.href = 'https://facebook.com/' + p.facebook;
        fb.target = '_blank';
        fb.style.cssText = 'font-size:0.65rem;padding:3px 8px;background:rgba(24,119,242,0.1);border:1px solid rgba(24,119,242,0.25);border-radius:20px;color:#1877f2;text-decoration:none;';
        fb.textContent = '👤 Facebook';
        socials.appendChild(fb);
      }
      if (socials.children.length) info.appendChild(socials);
    }
    card.appendChild(info);
    // Action button
    var btn = document.createElement('button');
    btn.style.cssText = 'flex-shrink:0;padding:8px 12px;border-radius:20px;font-size:0.72rem;font-weight:600;cursor:pointer;border:none;';
    if (status === 'accepted') {
      btn.textContent = '✓ Connected';
      btn.style.background = 'rgba(95,207,128,0.15)';
      btn.style.color = '#5fcf80';
      btn.style.border = '1px solid rgba(95,207,128,0.3)';
      btn.disabled = true;
    } else if (status === 'pending' && iRequested) {
      btn.textContent = 'Withdraw Request';
      btn.style.background = 'rgba(231,76,60,0.1)';
      btn.style.color = '#e74c3c';
      btn.style.border = '1px solid rgba(231,76,60,0.3)';
      btn.disabled = false;
      (function(pid){ btn.onclick = async function(){
        if (!confirm('Withdraw this connection request?')) return;
        await supa.from('connections').delete().match({ requester_id: currentUser.id, receiver_id: pid });
        toast('Request withdrawn');
        loadNetworkTab();
      }; })(p.id);
    } else if (status === 'pending' && !iRequested) {
      btn.textContent = '✓ Accept';
      btn.style.background = 'var(--ac)';
      btn.style.color = '#1a1208';
      (function(pid){ btn.onclick = function(){ acceptConnection(pid); }; })(p.id);
    } else {
      btn.textContent = '+ Connect';
      btn.style.background = 'var(--ac)';
      btn.style.color = '#1a1208';
      (function(pid){ btn.onclick = function(){ sendConnectionRequest(pid); }; })(p.id);
    }
    card.appendChild(btn);
    c.appendChild(card);
  });
  } catch(e) {
    console.log('Network load error:', e);
    c.innerHTML = '<div style="text-align:center;padding:20px;color:var(--tm);">Could not load members — please check your connection and try again</div>';
  }
}
async function renderConnections() {
  var c = document.getElementById('net-content');
  c.innerHTML = '<div style="text-align:center;padding:20px;color:var(--tm);">Loading...</div>';
  var _connRes = await supa.from('connections').select('*');
  var conns = (_connRes.data || []).filter(function(cn) { return cn.status === 'accepted' && (cn.requester_id === currentUser.id || cn.receiver_id === currentUser.id); });
  c.innerHTML = '';
  if (!conns.length) {
    c.innerHTML = '<div style="text-align:center;padding:40px;color:var(--tm);font-size:0.85rem;">No connections yet - go to Discover to connect with members</div>';
    return;
  }
  // Get profiles of connected users
  var ids = conns.map(function(conn) {
    return conn.requester_id === currentUser.id ? conn.receiver_id : conn.requester_id;
  });
  var profRes = await supa.from('profiles').select('*');
  var profiles = (profRes.data || []).filter(function(p) { return ids.indexOf(p.id) > -1; });
  // Map connection IDs and sharing preferences for each connection
  var connIdMap = {};
  var sharingMap = {};
  conns.forEach(function(cn) {
    var otherId = cn.requester_id === currentUser.id ? cn.receiver_id : cn.requester_id;
    connIdMap[otherId] = cn.id;
    // What the OTHER person chose to share with me
    if (cn.requester_id === currentUser.id) {
      // I'm the requester, so the other person is the receiver — their sharing prefs are in receiver_sharing
      var rSharing = cn.receiver_sharing;
      sharingMap[otherId] = (rSharing && rSharing.length) ? rSharing : ['instagram','whatsapp','facebook'];
    } else {
      // I'm the receiver, so the other person is the requester — their sharing prefs are in requester_sharing
      var qSharing = cn.requester_sharing;
      sharingMap[otherId] = (qSharing && qSharing.length) ? qSharing : ['instagram','whatsapp','facebook'];
    }
  });
  var hdr = document.createElement('div');
  hdr.style.cssText = 'font-size:0.65rem;font-weight:800;color:var(--ac);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px;';
  hdr.textContent = conns.length + ' connection' + (conns.length !== 1 ? 's' : '');
  c.appendChild(hdr);
  profiles.forEach(function(p) {
    var card = document.createElement('div');
    card.style.cssText = 'background:var(--sf);border:1px solid rgba(232,201,122,0.35);border-radius:var(--r);padding:14px 16px;margin-bottom:10px;';
    var top = document.createElement('div');
    top.style.cssText = 'display:flex;align-items:center;gap:12px;margin-bottom:10px;';
    var av = document.createElement('div');
    av.style.cssText = 'width:44px;height:44px;border-radius:50%;background:rgba(232,201,122,0.15);border:1px solid rgba(232,201,122,0.3);display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:700;color:var(--ac);flex-shrink:0;';
    av.textContent = (p.username || '?')[0].toUpperCase();
    var info = document.createElement('div');
    info.style.cssText = 'flex:1;';
    var name = document.createElement('div');
    name.style.cssText = 'font-weight:700;font-size:0.88rem;';
    name.textContent = p.username || 'Member';
    var loc = document.createElement('div');
    loc.style.cssText = 'font-size:0.72rem;color:var(--tm);';
    loc.textContent = p.location || '';
    info.appendChild(name);
    if (p.location) info.appendChild(loc);
    top.appendChild(av);
    top.appendChild(info);
    card.appendChild(top);
    // Socials - only show what the other person chose to share
    var shared = sharingMap[p.id] || ['instagram','whatsapp','facebook'];
    var socials = document.createElement('div');
    socials.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
    if (p.instagram && shared.indexOf('instagram') > -1) {
      var ig = document.createElement('a');
      ig.href = 'https://instagram.com/' + p.instagram.replace('@','');
      ig.target = '_blank';
      ig.style.cssText = 'font-size:0.72rem;padding:6px 12px;background:rgba(232,201,122,0.1);border:1px solid rgba(232,201,122,0.25);border-radius:20px;color:var(--ac);text-decoration:none;';
      ig.textContent = '📸 @' + p.instagram.replace('@','');
      socials.appendChild(ig);
    }
    if (p.whatsapp && shared.indexOf('whatsapp') > -1) {
      var wa = document.createElement('a');
      wa.href = formatWhatsAppLink(p.whatsapp, p.country);
      wa.target = '_blank';
      wa.style.cssText = 'font-size:0.72rem;padding:6px 12px;background:rgba(37,211,102,0.1);border:1px solid rgba(37,211,102,0.25);border-radius:20px;color:#25d366;text-decoration:none;';
      wa.textContent = '💬 ' + p.whatsapp;
      socials.appendChild(wa);
    }
    if (p.facebook && shared.indexOf('facebook') > -1) {
      var fb = document.createElement('a');
      fb.href = 'https://facebook.com/' + p.facebook;
      fb.target = '_blank';
      fb.style.cssText = 'font-size:0.72rem;padding:6px 12px;background:rgba(24,119,242,0.1);border:1px solid rgba(24,119,242,0.25);border-radius:20px;color:#1877f2;text-decoration:none;';
      fb.textContent = '👤 ' + p.facebook;
      socials.appendChild(fb);
    }
    var hasShared = (p.instagram && shared.indexOf('instagram') > -1) || (p.whatsapp && shared.indexOf('whatsapp') > -1) || (p.facebook && shared.indexOf('facebook') > -1);
    if (!hasShared) {
      var noSocial = document.createElement('div');
      noSocial.style.cssText = 'font-size:0.72rem;color:var(--tm);';
      noSocial.textContent = 'No social links shared yet';
      socials.appendChild(noSocial);
    }
    card.appendChild(socials);
    // Disconnect button
    var disconnectBtn = document.createElement('button');
    disconnectBtn.style.cssText = 'margin-top:10px;font-size:0.68rem;color:var(--tm);background:transparent;border:1px solid var(--bd);border-radius:20px;padding:5px 14px;cursor:pointer;';
    disconnectBtn.textContent = '✕ Disconnect';
    var _connId = connIdMap[p.id];
    var _personName = p.username || p.first_name || 'this person';
    disconnectBtn.addEventListener('click', (function(connId, name) { return function() { disconnectPerson(connId, name); }; })(_connId, _personName));
    card.appendChild(disconnectBtn);
    c.appendChild(card);
  });
}
async function disconnectPerson(connectionId, personName) {
  if (!confirm('Disconnect from ' + personName + '? Their socials will be hidden again.')) return;
  if (!supa || !connectionId) return;
  try {
    await supa.from('connections').delete().eq('id', connectionId);
    toast('Disconnected from ' + personName);
    clearCache();
    renderConnections();
  } catch(e) {
    console.error('Disconnect error:', e);
    toast('Could not disconnect — try again');
  }
}
async function renderRequests() {
  var c = document.getElementById('net-content');
  c.innerHTML = '<div style="text-align:center;padding:20px;color:var(--tm);">Loading...</div>';
  var res = await supa.from('connections').select('*').eq('receiver_id', currentUser.id).eq('status','pending');
  var requests = res.data || [];
  c.innerHTML = '';
  if (!requests.length) {
    c.innerHTML = '<div style="text-align:center;padding:40px;color:var(--tm);font-size:0.85rem;">No pending requests</div>';
    document.getElementById('net-req-badge').style.display = 'none';
    return;
  }
  var ids = requests.map(function(r){ return r.requester_id; });
  var profRes = await supa.from('profiles').select('*');
  var profiles = (profRes.data || []).filter(function(p) { return ids.indexOf(p.id) > -1; });
  var hdr = document.createElement('div');
  hdr.style.cssText = 'font-size:0.65rem;font-weight:800;color:var(--ac);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px;';
  hdr.textContent = requests.length + ' pending request' + (requests.length !== 1 ? 's' : '');
  c.appendChild(hdr);
  requests.forEach(function(req) {
    var p = profiles.find(function(x){ return x.id === req.requester_id; }) || {};
    var card = document.createElement('div');
    card.style.cssText = 'background:var(--sf);border:1px solid rgba(232,201,122,0.35);border-radius:var(--r);padding:14px 16px;margin-bottom:10px;display:flex;align-items:center;gap:12px;';
    var av = document.createElement('div');
    av.style.cssText = 'width:44px;height:44px;border-radius:50%;background:rgba(232,201,122,0.15);border:1px solid rgba(232,201,122,0.3);display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:700;color:var(--ac);flex-shrink:0;';
    av.textContent = (p.username || '?')[0].toUpperCase();
    var info = document.createElement('div');
    info.style.cssText = 'flex:1;';
    var name = document.createElement('div');
    name.style.cssText = 'font-weight:700;font-size:0.88rem;';
    name.textContent = (p.username || 'Member') + ' wants to connect';
    info.appendChild(name);
    var btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:6px;';
    var acceptBtn = document.createElement('button');
    acceptBtn.style.cssText = 'padding:7px 12px;background:var(--ac);border:none;border-radius:20px;color:#1a1208;font-size:0.72rem;font-weight:700;cursor:pointer;';
    acceptBtn.textContent = '✓ Accept';
    (function(rid){ acceptBtn.onclick = function(){ acceptConnection(rid); }; })(req.requester_id);
    var declineBtn = document.createElement('button');
    declineBtn.style.cssText = 'padding:7px 12px;background:transparent;border:1px solid var(--bd);border-radius:20px;color:var(--tm);font-size:0.72rem;cursor:pointer;';
    declineBtn.textContent = '✕ Decline';
    (function(rid){ declineBtn.onclick = function(){ declineConnection(rid); }; })(req.requester_id);
    btns.appendChild(acceptBtn);
    btns.appendChild(declineBtn);
    card.appendChild(av);
    card.appendChild(info);
    card.appendChild(btns);
    c.appendChild(card);
  });
}
async function sendConnectionRequest(userId) {
  if (!supa || !currentUser) return;
  if (!myProfile) {
    toast('Please set up your profile first');
    openEditProfile();
    return;
  }
  showSharingPicker('send', userId);
}
async function acceptConnection(userId) {
  if (!supa || !currentUser) return;
  showSharingPicker('accept', userId);
}
function showSharingPicker(action, userId) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9500;display:flex;align-items:center;justify-content:center;padding:20px;';
  var box = document.createElement('div');
  box.style.cssText = 'background:var(--bg);border:1px solid rgba(232,201,122,0.4);border-radius:16px;padding:24px;max-width:340px;width:100%;box-shadow:0 4px 30px rgba(0,0,0,0.5);';
  var title = document.createElement('div');
  title.style.cssText = 'font-family:Cormorant Garamond,serif;font-size:1.3rem;font-weight:300;color:var(--ac);text-align:center;margin-bottom:6px;';
  title.textContent = action === 'send' ? 'Connect' : 'Accept Connection';
  box.appendChild(title);
  var subtitle = document.createElement('div');
  subtitle.style.cssText = 'font-size:0.75rem;color:var(--tm);text-align:center;margin-bottom:18px;';
  subtitle.textContent = 'Choose what to share with this person';
  box.appendChild(subtitle);
  var shareState = { instagram: true, whatsapp: true, facebook: true };
  function makeToggle(key, emoji, label) {
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:14px;border:2px solid var(--ac);border-radius:12px;margin-bottom:8px;cursor:pointer;background:rgba(232,201,122,0.1);transition:all 0.15s;-webkit-tap-highlight-color:transparent;';
    var tick = document.createElement('div');
    tick.style.cssText = 'width:24px;height:24px;border-radius:50%;background:var(--ac);display:flex;align-items:center;justify-content:center;font-size:0.85rem;color:#1a1208;font-weight:700;flex-shrink:0;';
    tick.textContent = '\u2714';
    var text = document.createElement('span');
    text.style.cssText = 'font-size:0.9rem;font-weight:600;';
    text.textContent = emoji + '  ' + label;
    row.appendChild(tick);
    row.appendChild(text);
    row.addEventListener('click', function(e) {
      e.stopPropagation();
      shareState[key] = !shareState[key];
      if (shareState[key]) {
        row.style.borderColor = 'var(--ac)';
        row.style.background = 'rgba(232,201,122,0.1)';
        tick.style.background = 'var(--ac)';
        tick.style.border = 'none';
        tick.style.color = '#1a1208';
        tick.textContent = '\u2714';
      } else {
        row.style.borderColor = 'var(--bd)';
        row.style.background = 'transparent';
        tick.style.background = 'transparent';
        tick.style.border = '2px solid var(--bd)';
        tick.style.color = 'transparent';
        tick.textContent = '';
      }
    });
    return row;
  }
  box.appendChild(makeToggle('instagram', '\ud83d\udcf8', 'Instagram'));
  box.appendChild(makeToggle('whatsapp', '\ud83d\udcac', 'WhatsApp'));
  box.appendChild(makeToggle('facebook', '\ud83d\udc64', 'Facebook'));
  var note = document.createElement('div');
  note.style.cssText = 'font-size:0.65rem;color:var(--tm);text-align:center;margin:14px 0;';
  note.textContent = 'Only your selected socials will be visible to this person';
  box.appendChild(note);
  var confirmBtn = document.createElement('button');
  confirmBtn.style.cssText = 'width:100%;padding:14px;background:var(--ac);border:none;border-radius:var(--r);color:#1a1208;font-weight:800;font-size:0.9rem;cursor:pointer;margin-bottom:8px;';
  confirmBtn.textContent = action === 'send' ? 'Send Request' : 'Accept & Connect';
  confirmBtn.addEventListener('click', async function() {
    var sharing = [];
    if (shareState.instagram) sharing.push('instagram');
    if (shareState.whatsapp) sharing.push('whatsapp');
    if (shareState.facebook) sharing.push('facebook');
    confirmBtn.textContent = 'Please wait...';
    confirmBtn.disabled = true;
    if (action === 'send') {
      // Check if a connection already exists (pending or otherwise)
      var existing = await supa.from('connections').select('id,status').or('and(requester_id.eq.' + currentUser.id + ',receiver_id.eq.' + userId + '),and(requester_id.eq.' + userId + ',receiver_id.eq.' + currentUser.id + ')');
      if (existing.data && existing.data.length > 0) {
        var conn = existing.data[0];
        if (conn.status === 'accepted') { toast('Already connected \u2714'); overlay.remove(); renderDiscover(); return; }
        if (conn.status === 'pending') { toast('Request already sent \u2014 waiting for them to accept'); overlay.remove(); return; }
      }
      var res = await supa.from('connections').insert({ requester_id: currentUser.id, receiver_id: userId, status: 'pending', requester_sharing: sharing });
      if (res.error) { toast('Could not send request \u2014 please try again'); overlay.remove(); return; }
      toast('Connection request sent! \u2714');
      clearCache();
      netDiscoverProfiles = [];
      renderDiscover();
    } else {
      await supa.from('connections').update({ status: 'accepted', receiver_sharing: sharing }).eq('requester_id', userId).eq('receiver_id', currentUser.id);
      toast('Connected! \u2714');
      clearCache();
      checkConnectionRequests();
      switchNetTab('connections');
    }
    overlay.remove();
  });
  box.appendChild(confirmBtn);
  var cancelBtn = document.createElement('button');
  cancelBtn.style.cssText = 'width:100%;padding:12px;background:transparent;border:1px solid var(--bd);border-radius:var(--r);color:var(--tm);cursor:pointer;font-size:0.82rem;';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', function() { overlay.remove(); });
  box.appendChild(cancelBtn);
  overlay.appendChild(box);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

async function declineConnection(userId) {
  if (!supa || !currentUser) return;
  await supa.from('connections').delete().eq('requester_id', userId).eq('receiver_id', currentUser.id);
  toast('Request declined');
  renderRequests();
}
async function checkConnectionRequests() {
  if (!supa || !currentUser) return;
  var res = await supa.from('connections').select('*').eq('receiver_id', currentUser.id).eq('status','pending');
  var count = res.data ? res.data.length : 0;
  var badge = document.getElementById('net-req-badge');
  var dot = document.getElementById('nav-network-dot');
  if (badge) {
    if (count > 0) { badge.textContent = count; badge.style.display = 'inline'; }
    else { badge.style.display = 'none'; }
  }
  if (dot) dot.style.display = count > 0 ? 'block' : 'none';
}
function openEditProfile() {
  // Build profile edit modal
  var existing = myProfile || {};
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9000;display:flex;align-items:flex-end;';
  var sheet = document.createElement('div');
  sheet.style.cssText = 'background:var(--bg);border-radius:20px 20px 0 0;padding:24px 20px 40px;width:100%;max-height:90vh;overflow-y:auto;';
  var title = document.createElement('div');
  title.style.cssText = 'font-family:"Cormorant Garamond",serif;font-size:1.5rem;color:var(--ac);margin-bottom:16px;';
  title.textContent = 'My Profile';
  sheet.appendChild(title);
  function addField(label, id, placeholder, val) {
    var l = document.createElement('div');
    l.style.cssText = 'font-size:0.65rem;font-weight:800;color:var(--ac);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;margin-top:12px;';
    l.textContent = label;
    var inp = document.createElement('input');
    inp.className = 'input';
    inp.id = 'prof-' + id;
    inp.placeholder = placeholder;
    inp.value = val || '';
    inp.style.marginBottom = '0';
    sheet.appendChild(l);
    sheet.appendChild(inp);
  }
  addField('Username', 'username', 'How others will see you', existing.username);
  addField('Location', 'location', 'City or country (optional)', existing.location);
  addField('Instagram', 'instagram', '@username', existing.instagram);
  addField('WhatsApp', 'whatsapp', '+44... (connected members only)', existing.whatsapp);
  addField('Facebook', 'facebook', 'profile name or URL', existing.facebook);
  var note = document.createElement('div');
  note.style.cssText = 'font-size:0.7rem;color:var(--tm);margin-top:12px;margin-bottom:16px;line-height:1.5;';
  note.textContent = '🔒 Your social links are only visible to members you have connected with';
  sheet.appendChild(note);
  var saveBtn = document.createElement('button');
  saveBtn.className = 'btn';
  saveBtn.style.width = '100%';
  saveBtn.textContent = 'Save Profile';
  saveBtn.onclick = async function() {
    var username = document.getElementById('prof-username').value.trim();
    if (!username) { toast('Please enter a username'); return; }
    var data = {
      id: currentUser.id,
      username: username,
      location: document.getElementById('prof-location').value.trim() || null,
      instagram: document.getElementById('prof-instagram').value.trim() || null,
      whatsapp: document.getElementById('prof-whatsapp').value.trim() || null,
      facebook: document.getElementById('prof-facebook').value.trim() || null
    };
    var res = await supa.from('profiles').upsert(data);
    if (res.error) { toast('Could not save: ' + res.error.message); return; }
    myProfile = data;
    toast('Profile saved ✓');
    document.body.removeChild(overlay);
    renderDiscover();
  };
  sheet.appendChild(saveBtn);
  var cancelBtn = document.createElement('button');
  cancelBtn.style.cssText = 'width:100%;margin-top:8px;padding:12px;border:1px solid var(--bd);border-radius:var(--r);background:transparent;color:var(--tm);cursor:pointer;';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = function(){ document.body.removeChild(overlay); };
  sheet.appendChild(cancelBtn);
  overlay.appendChild(sheet);
  overlay.onclick = function(e){ if(e.target===overlay) document.body.removeChild(overlay); };
  document.body.appendChild(overlay);
}




// =====================
// MISSING / FIXED FUNCTIONS
// =====================

// cycleQuote defined below

// toggleBook - expand/collapse book details
function toggleReadingSection(header) {
  var body = header.nextElementSibling;
  var chevron = header.querySelector('.reading-chevron');
  if (!body) return;
  if (body.style.display === 'none') {
    body.style.display = 'block';
    if (chevron) chevron.style.transform = 'rotate(180deg)';
  } else {
    body.style.display = 'none';
    if (chevron) chevron.style.transform = '';
  }
}
function toggleBook(btn) {
  var card = btn.parentElement;
  // Support both class names
  var details = card.querySelector('.book-card-body') || card.querySelector('.book-details');
  if (!details) return;
  var isOpen = card.classList.contains('open');
  card.classList.toggle('open');
  details.style.display = isOpen ? 'none' : 'block';
  var chevron = btn.querySelector('.book-chevron');
  if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(90deg)';
  // Apply saved region to any buy links in this card
  if (!isOpen) {
    var region = localStorage.getItem('cl_region') || '';
    var store = NA_STORES[region];
    if (store) {
      card.querySelectorAll('.book-region-buy').forEach(function(el) {
        el.href = store.url;
        el.textContent = store.label + ' \u203a';
        el.style.background = 'var(--ac)';
        el.style.color = '#1a1208';
        el.style.fontWeight = '700';
      });
    }
  }
}

function loadSavedRegion() {
  var saved = localStorage.getItem('cl_region') || '';
  if (!saved) return;
  var wsRegion = document.getElementById('worksheet-region');
  var booksRegion = document.getElementById('books-region');
  if (wsRegion) { wsRegion.value = saved; updateWorksheetLink(); }
  if (booksRegion) { booksRegion.value = saved; updateBooksRegion(); }
}

// Regional store links

function updateWorksheetLink() {
  var region = document.getElementById('worksheet-region').value;
  var link = document.getElementById('worksheet-buy-link');
  if (!link) return;
  if (!region) { link.style.display = 'none'; return; }
  var store = NA_STORES[region];
  if (!store) { link.style.display = 'none'; return; }
  link.href = store.url;
  link.textContent = store.label + ' ›';
  link.style.display = 'block';
  localStorage.setItem('cl_region', region);
  // Also update books region selector if present
  var booksRegion = document.getElementById('books-region');
  if (booksRegion) { booksRegion.value = region; updateBooksRegion(); }
}

function updateBooksRegion() {
  var booksEl = document.getElementById('books-region');
  var region = booksEl ? booksEl.value : '';
  if (!region) region = localStorage.getItem('cl_region') || '';
  if (!region) return;
  localStorage.setItem('cl_region', region);
  // Sync books selector
  if (booksEl && !booksEl.value) booksEl.value = region;
  // Sync worksheet selector too
  var wsEl = document.getElementById('worksheet-region');
  if (wsEl && !wsEl.value) wsEl.value = region;
  // Update all book buy links
  var store = NA_STORES[region];
  if (!store) return;
  document.querySelectorAll('.book-region-buy').forEach(function(el) {
    el.href = store.url;
    el.textContent = store.label + ' \u203a';
    el.style.background = 'var(--ac)';
    el.style.color = '#1a1208';
    el.style.fontWeight = '700';
    el.style.borderColor = 'var(--ac)';
  });
}

// saveCustomStep10
function saveCustomStep10() {
  var el = document.getElementById('custom-step10');
  var val = el ? el.value : '';
  localStorage.setItem('na_custom_step10', val);
  toast('Step 10 questions saved');
}

// saveCustomGuiding
function saveCustomGuiding() {
  var el = document.getElementById('custom-guiding');
  var val = el ? el.value : '';
  localStorage.setItem('na_custom_guiding', val);
  toast('Guiding Principles questions saved');
}

function clearCustomStep10() {
  if (!confirm('Reset your Step 10 questions? This will clear everything you have written.')) return;
  localStorage.removeItem('na_custom_step10');
  var el = document.getElementById('custom-step10');
  if (el) el.value = '';
  toast('Step 10 questions reset');
}

function clearCustomGuiding() {
  if (!confirm('Reset your Guiding Principles? This will clear everything you have written.')) return;
  localStorage.removeItem('na_custom_guiding');
  var el = document.getElementById('custom-guiding');
  if (el) el.value = '';
  toast('Guiding Principles reset');
}

function loadCustomWorksheets() {
  var s10 = localStorage.getItem('na_custom_step10') || '';
  var gp = localStorage.getItem('na_custom_guiding') || '';
  var el10 = document.getElementById('custom-step10');
  var elGp = document.getElementById('custom-guiding');
  if (el10 && s10) el10.value = s10;
  if (elGp && gp) elGp.value = gp;
}

// showExportPicker - journal export to clipboard or connections
function showExportPicker(entryId) {
  var entries = JSON.parse(localStorage.getItem('na_journal') || '[]');
  if (!entries.length) { toast('No journal entries to export'); return; }
  
  // If no specific entry, show entry picker first
  if (!entryId) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:flex-end;';
    var sheet = document.createElement('div');
    sheet.style.cssText = 'background:var(--sf);border-radius:20px 20px 0 0;padding:24px 20px 40px;width:100%;max-height:80vh;overflow-y:auto;';
    sheet.innerHTML = '<div style="font-size:0.65rem;font-weight:800;color:var(--ac);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:16px;">Choose an entry to export</div>';
    // Show entries newest first
    var sorted = entries.slice().reverse();
    sorted.forEach(function(e) {
      var btn = document.createElement('button');
      var d = new Date(e.date);
      var dateStr = d.toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'});
      var type = e.type || 'daily';
      var preview = (e.text || '').substring(0, 60) + ((e.text||'').length > 60 ? '...' : '');
      btn.style.cssText = 'display:block;width:100%;text-align:left;margin-bottom:8px;padding:14px 16px;background:rgba(232,201,122,0.06);border:1px solid rgba(232,201,122,0.2);border-radius:var(--r);color:var(--tx);cursor:pointer;';
      btn.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;"><span style="font-weight:600;font-size:0.82rem;">' + dateStr + '</span><span style="font-size:0.65rem;color:var(--ac);text-transform:uppercase;">' + type + '</span></div><div style="font-size:0.72rem;color:var(--tm);line-height:1.4;">' + preview + '</div>';
      (function(eid) { btn.onclick = function() { document.body.removeChild(overlay); showExportPicker(eid); }; })(e.id);
      sheet.appendChild(btn);
    });
    var closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'width:100%;padding:12px;background:transparent;border:1px solid var(--bd);border-radius:var(--r);color:var(--tm);cursor:pointer;margin-top:8px;font-size:0.82rem;';
    closeBtn.textContent = 'Cancel';
    closeBtn.onclick = function() { document.body.removeChild(overlay); };
    sheet.appendChild(closeBtn);
    overlay.appendChild(sheet);
    overlay.addEventListener('click', function(ev) { if (ev.target === overlay) document.body.removeChild(overlay); });
    document.body.appendChild(overlay);
    return;
  }
  
  var entry = entries.find(function(e){ return e.id == entryId; });
  if (!entry) { toast('Entry not found'); return; }
  var text = new Date(entry.date).toLocaleDateString('en-GB') + '\n\n' + (entry.text||'');

  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:flex-end;';
  var sheet = document.createElement('div');
  sheet.style.cssText = 'background:var(--sf);border-radius:20px 20px 0 0;padding:24px 20px 40px;width:100%;max-height:80vh;overflow-y:auto;';
  sheet.innerHTML = '<div style="font-size:0.65rem;font-weight:800;color:var(--ac);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:16px;">Export Entry</div>';

  // Copy button
  var copyBtn = document.createElement('button');
  copyBtn.style.cssText = 'display:flex;align-items:center;gap:12px;width:100%;margin-bottom:10px;padding:14px 16px;background:rgba(232,201,122,0.1);border:1px solid rgba(232,201,122,0.3);border-radius:var(--r);color:var(--ac);font-size:0.88rem;cursor:pointer;text-align:left;';
  copyBtn.innerHTML = '<span style="font-size:1.3rem;">📋</span><div><div style="font-weight:600;">Copy to Clipboard</div><div style="font-size:0.7rem;color:var(--tm);">Paste anywhere</div></div>';
  copyBtn.onclick = function() {
    if (navigator.clipboard) { navigator.clipboard.writeText(text).then(function(){ toast('Copied ✓'); }); }
    else { toast('Copy not available'); }
    document.body.removeChild(overlay);
  };
  sheet.appendChild(copyBtn);

  if (!currentUser || !supa) {
    var noUser = document.createElement('div');
    noUser.style.cssText = 'font-size:0.78rem;color:var(--tm);padding:8px 0;';
    noUser.textContent = 'Sign in to send to connections';
    sheet.appendChild(noUser);
  } else {
    var loading = document.createElement('div');
    loading.style.cssText = 'font-size:0.78rem;color:var(--tm);';
    loading.textContent = 'Loading...';
    sheet.appendChild(loading);

    supa.from('connections').select('*').then(function(res){
      var conns = (res.data || []).filter(function(cn) { return cn.status === 'accepted' && (cn.requester_id === currentUser.id || cn.receiver_id === currentUser.id); });
      var ids = conns.map(function(c){ return c.requester_id === currentUser.id ? c.receiver_id : c.requester_id; });
      if (!ids.length) { loading.textContent = 'No connections yet'; return; }
      supa.from('profiles').select('id,username,whatsapp').then(function(pr){
        loading.textContent = '';
        var profiles = (pr.data||[]).filter(function(p){ return ids.indexOf(p.id) > -1; });
        var waProfiles = profiles.filter(function(p){ return p.whatsapp; });

        // ---- GROUPS SECTION ---- always show regardless of WhatsApp
        var groupsHdr = document.createElement('div');
        groupsHdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin:14px 0 8px;';
        groupsHdr.innerHTML = '<div style="font-size:0.65rem;font-weight:800;color:var(--ac);text-transform:uppercase;letter-spacing:0.08em;">Groups</div>';
        var newGroupBtn = document.createElement('button');
        newGroupBtn.style.cssText = 'font-size:0.68rem;color:var(--ac);background:transparent;border:1px solid rgba(232,201,122,0.3);border-radius:6px;padding:3px 8px;cursor:pointer;';
        newGroupBtn.textContent = '+ New Group';
        groupsHdr.appendChild(newGroupBtn);
        sheet.appendChild(groupsHdr);

        var groupsContainer = document.createElement('div');
        sheet.appendChild(groupsContainer);

        async function renderGroups() {
          var groupsRes = await supa.from('profiles').select('*').eq('id', currentUser.id).single();
          var groups = (groupsRes.data && groupsRes.data.export_groups) ? groupsRes.data.export_groups : [];
          groupsContainer.innerHTML = '';
          if (!groups.length) {
            var noGroups = document.createElement('div');
            noGroups.style.cssText = 'font-size:0.75rem;color:var(--tm);padding:6px 0 10px;';
            noGroups.textContent = 'No groups yet — create one to send to multiple people at once';
            groupsContainer.appendChild(noGroups);
            return;
          }
          groups.forEach(function(group, gi) {
            (function(grp, grpIndex) {
              var row = document.createElement('div');
              row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';
              var sendBtn = document.createElement('button');
              sendBtn.style.cssText = 'flex:1;display:flex;align-items:center;gap:10px;padding:11px 14px;background:rgba(232,201,122,0.1);border:1px solid rgba(232,201,122,0.3);border-radius:var(--r);color:var(--tx);font-size:0.82rem;cursor:pointer;text-align:left;-webkit-tap-highlight-color:rgba(232,201,122,0.2);touch-action:manipulation;';
              var memberNames = grp.memberIds.map(function(id){
                var p = profiles.find(function(p){ return p.id === id; });
                return p ? p.username : null;
              }).filter(Boolean);
              sendBtn.innerHTML = '<span style="font-size:1.1rem;">\u{1F465}</span><div><div style="font-weight:700;color:var(--ac);">'+grp.name+'</div><div style="font-size:0.65rem;color:var(--tm);">'+(memberNames.length ? memberNames.join(', ') : 'Tap to send')+'</div></div>';

              function doGroupSend() {
                var groupMembers = grp.memberIds.map(function(id){
                  var p = profiles.find(function(p){ return p.id === id; });
                  return p;
                }).filter(Boolean);
                if (groupMembers.length === 1 && groupMembers[0] && groupMembers[0].whatsapp) {
                  var num = groupMembers[0].whatsapp.replace(/[^0-9+]/g,'');
                  window.open('https://wa.me/'+num+'?text='+encodeURIComponent(text),'_blank');
                  document.body.removeChild(overlay);
                  return;
                }
                var copyText = text;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(copyText).then(function(){
                    toast('Copied \u2713 \u2014 paste to your ' + grp.name + ' group');
                    document.body.removeChild(overlay);
                  }).catch(function(){
                    var ta = document.createElement('textarea');
                    ta.value = copyText;
                    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
                    document.body.appendChild(ta);
                    ta.focus(); ta.select();
                    try { document.execCommand('copy'); toast('Copied \u2713 \u2014 paste to your ' + grp.name + ' group'); }
                    catch(e) { toast('Please copy manually and send to ' + grp.name); }
                    document.body.removeChild(ta);
                    document.body.removeChild(overlay);
                  });
                } else {
                  var ta = document.createElement('textarea');
                  ta.value = copyText;
                  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
                  document.body.appendChild(ta);
                  ta.focus(); ta.select();
                  try { document.execCommand('copy'); toast('Copied \u2713 \u2014 paste to your ' + grp.name + ' group'); }
                  catch(e) { toast('Please copy manually and send to ' + grp.name); }
                  document.body.removeChild(ta);
                  document.body.removeChild(overlay);
                }
              }

              sendBtn.addEventListener('click', doGroupSend);
              sendBtn.addEventListener('touchend', function(e){ e.preventDefault(); doGroupSend(); });

              var editBtn = document.createElement('button');
              editBtn.style.cssText = 'padding:8px 10px;background:transparent;border:1px solid var(--bd);border-radius:8px;color:var(--tm);font-size:0.72rem;cursor:pointer;touch-action:manipulation;';
              editBtn.textContent = 'Edit';
              editBtn.addEventListener('click', function() { openGroupEditor(grp, grpIndex, profiles, renderGroups); });
              row.appendChild(sendBtn);
              row.appendChild(editBtn);
              groupsContainer.appendChild(row);
            })(group, gi);
          });
        }
        renderGroups();

        newGroupBtn.addEventListener('click', function() { openGroupEditor(null, null, profiles, renderGroups); });

        // ---- INDIVIDUAL CONNECTIONS (WhatsApp only) ----
        if (waProfiles.length) {
          var connHdr = document.createElement('div');
          connHdr.style.cssText = 'font-size:0.65rem;font-weight:800;color:var(--ac);text-transform:uppercase;letter-spacing:0.08em;margin:14px 0 8px;';
          connHdr.textContent = 'Send to a connection';
          sheet.appendChild(connHdr);

          waProfiles.forEach(function(p){
            var btn = document.createElement('button');
            btn.style.cssText = 'display:flex;align-items:center;gap:12px;width:100%;margin-bottom:8px;padding:12px 16px;background:rgba(37,211,102,0.08);border:1px solid rgba(37,211,102,0.25);border-radius:var(--r);color:var(--tx);font-size:0.85rem;cursor:pointer;text-align:left;touch-action:manipulation;';
            btn.innerHTML = '<span style="font-size:1.2rem;">\u{1F4AC}</span><div><div style="font-weight:600;color:#25d366;">'+(p.username||'Connection')+'</div><div style="font-size:0.68rem;color:var(--tm);">WhatsApp \u00B7 '+p.whatsapp+'</div></div>';
            btn.addEventListener('click', function(){
              if (!confirm('Are you sure you want to send this journal entry to ' + (p.username||'this connection') + '?')) return;
              var num = p.whatsapp.replace(/[^0-9+]/g,'');
              window.open('https://wa.me/'+num+'?text='+encodeURIComponent(text),'_blank');
              document.body.removeChild(overlay);
            });
            sheet.appendChild(btn);
          });
        } else {
          var noWa = document.createElement('div');
          noWa.style.cssText = 'font-size:0.75rem;color:var(--tm);padding:8px 0;';
          noWa.textContent = 'None of your connections have WhatsApp set up yet';
          sheet.appendChild(noWa);
        }
      });
    });
  }

  var cancelBtn = document.createElement('button');
  cancelBtn.style.cssText = 'width:100%;margin-top:10px;padding:14px;background:transparent;border:1px solid var(--bd);border-radius:var(--r);color:var(--tm);font-size:0.88rem;cursor:pointer;';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = function() { document.body.removeChild(overlay); };
  sheet.appendChild(cancelBtn);
  overlay.appendChild(sheet);
  overlay.onclick = function(e) { if(e.target===overlay) document.body.removeChild(overlay); };
  document.body.appendChild(overlay);
}

function showToast(msg, duration) {
  toast(msg);
}


// =====================
// JOURNAL GROUP CHAT
// =====================
var currentJournalGroupChat = null;
var journalGroupChatSubscription = null;
var selectedJournalMessage = null;

async function deleteJournalGroupMessage(msgId, reloadFn) {
  if (!confirm('Delete this message?')) return;
  try {
    await supa.from('journal_group_messages').delete().eq('id', msgId);
    if (reloadFn) reloadFn();
  } catch(e) { toast('Could not delete message'); }
}

async function renderJournalGroups() {
  var container = document.getElementById('j-group-list');
  if (!container) return;
  if (!currentUser || !supa) { container.innerHTML = ''; return; }
  try {
    var res = await supa.from('profiles').select('export_groups').eq('id', currentUser.id).single();
    var groups = (res.data && res.data.export_groups) ? res.data.export_groups : [];
    container.innerHTML = '';
    if (!groups.length) {
      container.innerHTML = '<div style="font-size:0.75rem;color:var(--tm);padding:6px 0 2px;">No groups yet — create one to start a group chat</div>';
      return;
    }
    groups.forEach(function(grp, gi) {
      var card = document.createElement('div');
      card.style.cssText = 'display:flex;align-items:center;gap:10px;padding:11px 14px;background:var(--sf);border:1px solid var(--bd);border-radius:var(--r);margin-bottom:8px;cursor:pointer;';
      card.innerHTML = '<span style="font-size:1.2rem;">&#x1F4AC;</span><div style="flex:1;"><div style="font-weight:700;font-size:0.84rem;color:var(--ac);">' + grp.name + '</div><div style="font-size:0.65rem;color:var(--tm);">' + (grp.memberIds ? grp.memberIds.length : 0) + ' member' + (grp.memberIds && grp.memberIds.length !== 1 ? 's' : '') + '</div></div><div style="font-size:0.8rem;color:var(--tm);">&#8250;</div>';
      (function(g, idx) {
        card.addEventListener('click', function() { openJournalGroupChat(g, idx); });
      })(grp, gi);
      container.appendChild(card);
    });
  } catch(e) { console.log('Journal groups error:', e); }
}

async function openJournalGroupChat(grp, grpIndex) {
  if (!currentUser || !supa) { toast('Please sign in first'); return; }
  currentJournalGroupChat = { grp: grp, grpIndex: grpIndex };
  var chatId = 'journal_group_' + grp.name.replace(/\s+/g,'_').toLowerCase() + '_' + grpIndex;
  currentJournalGroupChat.chatId = chatId;

  // Load member names
  var memberNames = 'Loading...';
  try {
    var memberRes = await supa.from('profiles').select('id,username').in('id', grp.memberIds || []);
    memberNames = (memberRes.data || []).map(function(p) { return p.username || 'Member'; }).join(', ') || 'No members';
  } catch(e) {}

  // Build overlay using same pattern as event chat
  var o = makeChatOverlay(grp.name, memberNames);
  var sheet = o.sheet;

  // Add delete button to header
  var jChatHdr = sheet.firstChild;
  var deleteJChatBtn = document.createElement('button');
  deleteJChatBtn.style.cssText = 'background:none;border:none;color:#e74c3c;font-size:1rem;cursor:pointer;padding:0 6px;opacity:0.75;';
  deleteJChatBtn.title = 'Delete this chat';
  deleteJChatBtn.textContent = '🗑️';
  deleteJChatBtn.onclick = async function() {
    if (!confirm('Delete all messages in this group chat? This cannot be undone.')) return;
    deleteJChatBtn.textContent = '⏳';
    deleteJChatBtn.style.pointerEvents = 'none';
    try {
      var r1 = await supa.from('journal_group_messages').delete().eq('chat_id', chatId);
      if (r1.error) { toast('Could not delete: ' + r1.error.message); deleteJChatBtn.textContent = '🗑️'; deleteJChatBtn.style.pointerEvents = 'auto'; return; }
      closeChatOverlay();
      toast('Chat deleted ✓');
    } catch(e) { toast('Error: ' + (e.message || 'unknown')); deleteJChatBtn.textContent = '🗑️'; deleteJChatBtn.style.pointerEvents = 'auto'; }
  };
  jChatHdr.insertBefore(deleteJChatBtn, jChatHdr.lastChild);

  // Messages area
  var msgArea = document.createElement('div');
  msgArea.style.cssText = 'flex:1;min-height:0;overflow-y:scroll;-webkit-overflow-scrolling:touch;padding:14px 16px;display:flex;flex-direction:column;gap:6px;scrollbar-width:thin;scrollbar-color:rgba(232,201,122,0.3) transparent;';
  msgArea.innerHTML = '<div style="text-align:center;font-size:0.72rem;color:var(--tm);padding:8px 0;">Loading messages...</div>';
  sheet.appendChild(msgArea);

  // Drop entry button
  var dropBtn = document.createElement('button');
  dropBtn.style.cssText = 'margin:0 14px 8px;padding:10px;background:#16213e;border:1px solid rgba(232,201,122,0.2);border-radius:10px;color:#e8c97a;font-size:0.78rem;font-weight:700;cursor:pointer;text-align:left;';
  dropBtn.textContent = '📄 Drop a journal entry into chat';
  dropBtn.onclick = function() { openJournalEntryPicker(chatId, loadMessages); };
  sheet.appendChild(dropBtn);

  // Input row
  var inputRow = document.createElement('div');
  inputRow.style.cssText = 'padding:10px 14px 12px;border-top:1px solid rgba(232,201,122,0.15);display:flex;gap:8px;align-items:center;flex-shrink:0;background:var(--sf);';
  var msgInput = document.createElement('input');
  msgInput.type = 'text';
  msgInput.style.cssText = 'flex:1;height:42px;background:#16213e;border:1px solid rgba(232,201,122,0.15);border-radius:10px;padding:0 14px;color:#f0ead6;font-size:0.84rem;outline:none;';
  msgInput.placeholder = 'Message...';
  var sendBtn = document.createElement('button');
  sendBtn.style.cssText = 'width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--ac),#c9a84c);border:none;color:#1a1208;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
  sendBtn.textContent = '↑';
  inputRow.appendChild(msgInput);
  inputRow.appendChild(sendBtn);
  sheet.appendChild(inputRow);

  function scrollToBottom() { msgArea.scrollTop = msgArea.scrollHeight; }

  async function loadMessages() {
    try {
      var res = await supa.from('journal_group_messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true });
      var msgs = res.data || [];
      msgArea.innerHTML = '';
      if (!msgs.length) {
        msgArea.innerHTML = '<div style="text-align:center;font-size:0.78rem;color:var(--tm);padding:30px 0;">No messages yet 🌿<br><span style="font-size:0.7rem;">Say hello or drop a journal entry</span></div>';
        return;
      }
      msgs.forEach(function(msg) {
        var mine = msg.sender_id === currentUser.id;
        var isEntry = msg.message && msg.message.startsWith('[JOURNAL ENTRY]');
        var displayText = isEntry ? msg.message.replace('[JOURNAL ENTRY] ', '') : msg.message;
        var wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex;flex-direction:column;align-items:' + (mine ? 'flex-end' : 'flex-start') + ';margin-bottom:4px;';
        var bubble = document.createElement('div');
        bubble.style.cssText = 'max-width:80%;padding:10px 14px;border-radius:' + (mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px') + ';' + (isEntry ? 'background:rgba(232,201,122,0.12);border:1px solid rgba(232,201,122,0.3);' : (mine ? 'background:linear-gradient(135deg,var(--ac),#c9a84c);color:#1a1208;' : 'background:var(--sf);')) + 'font-size:0.86rem;line-height:1.5;word-break:break-word;';
        if (isEntry) {
          bubble.innerHTML = '<div style="font-size:0.6rem;font-weight:800;color:var(--ac);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:5px;">📄 Journal Entry</div>' + displayText.replace(/\n/g,'<br>');
        } else {
          bubble.textContent = displayText;
        }
        // Long press to delete own messages
        if (mine) {
          (function(msgId) {
            var pressTimer;
            bubble.addEventListener('touchstart', function() { pressTimer = setTimeout(function() { deleteJournalGroupMessage(msgId, loadMessages); }, 600); });
            bubble.addEventListener('touchend', function() { clearTimeout(pressTimer); });
          })(msg.id);
        }
        var timeEl = document.createElement('div');
        timeEl.style.cssText = 'font-size:0.6rem;color:var(--tm);margin-top:2px;' + (mine ? 'margin-right:4px;' : 'margin-left:4px;');
        timeEl.textContent = new Date(msg.created_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
        wrap.appendChild(bubble);
        wrap.appendChild(timeEl);
        msgArea.appendChild(wrap);
      });
      scrollToBottom();
    } catch(e) { console.log('Load journal messages error:', e); }
  }

  await loadMessages();

  async function doSend() {
    var txt = msgInput.value.trim();
    if (!txt) return;
    msgInput.value = '';
    try {
      await supa.from('journal_group_messages').insert({ chat_id: chatId, sender_id: currentUser.id, message: txt });
      await loadMessages();
    } catch(e) { toast('Could not send'); }
  }

  sendBtn.onclick = doSend;
  msgInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') doSend(); });

  // Realtime
  if (journalGroupChatSubscription) { try { supa.removeChannel(journalGroupChatSubscription); } catch(e) {} }
  journalGroupChatSubscription = supa.channel('jgc_' + chatId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'journal_group_messages', filter: 'chat_id=eq.' + chatId }, function() {
      loadMessages();
    }).subscribe();
}

function openJournalEntryPicker(chatId, reloadFn) {
  var entries = JSON.parse(localStorage.getItem('na_journal') || '[]');
  if (!entries.length) { toast('No journal entries to share'); return; }
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:20000;display:flex;align-items:flex-end;';
  var sheet = document.createElement('div');
  sheet.style.cssText = 'background:var(--sf);border-radius:20px 20px 0 0;padding:24px 20px 40px;width:100%;max-height:75vh;overflow-y:auto;';
  sheet.innerHTML = '<div style="font-size:0.65rem;font-weight:800;color:var(--ac);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:14px;">Choose an entry to share</div>';
  var sorted = entries.slice().reverse();
  sorted.forEach(function(e) {
    var btn = document.createElement('button');
    var d = new Date(e.date);
    var dateStr = d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
    var preview = (e.text || '').substring(0, 60) + ((e.text||'').length > 60 ? '...' : '');
    btn.style.cssText = 'display:block;width:100%;text-align:left;margin-bottom:8px;padding:12px 14px;background:rgba(232,201,122,0.06);border:1px solid rgba(232,201,122,0.2);border-radius:var(--r);color:var(--tx);cursor:pointer;';
    btn.innerHTML = '<div style="font-weight:600;font-size:0.8rem;margin-bottom:3px;">' + dateStr + ' · <span style="color:var(--ac);">' + (e.type||'daily') + '</span></div><div style="font-size:0.72rem;color:var(--tm);">' + preview + '</div>';
    (function(entry) {
      btn.onclick = async function() {
        if (!confirm('Share this entry in the chat?')) return;
        document.body.removeChild(overlay);
        var entryText = '[JOURNAL ENTRY] ' + dateStr + '\n\n' + (entry.text || '');
        try {
          await supa.from('journal_group_messages').insert({ chat_id: chatId, sender_id: currentUser.id, message: entryText });
          toast('Entry shared ✓');
          if (reloadFn) reloadFn();
        } catch(err) { toast('Could not share entry'); }
      };
    })(e);
    sheet.appendChild(btn);
  });
  var cancelBtn = document.createElement('button');
  cancelBtn.style.cssText = 'width:100%;padding:12px;background:transparent;border:1px solid var(--bd);border-radius:var(--r);color:var(--tm);cursor:pointer;margin-top:4px;';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = function() { document.body.removeChild(overlay); };
  sheet.appendChild(cancelBtn);
  overlay.appendChild(sheet);
  overlay.addEventListener('click', function(ev) { if (ev.target === overlay) document.body.removeChild(overlay); });
  document.body.appendChild(overlay);
}

function closeJournalGroupChat() {
  if (journalGroupChatSubscription) { try { supa.removeChannel(journalGroupChatSubscription); } catch(e) {} journalGroupChatSubscription = null; }
  currentJournalGroupChat = null;
  closeChatOverlay();
}

function openJournalGroupEditor(group, groupIndex) {
  // Load connections then open editor
  if (!currentUser || !supa) { toast('Please sign in first'); return; }
  supa.from('connections').select('*').then(function(res) {
    var conns = (res.data || []).filter(function(c) { return c.status === 'accepted' && (c.requester_id === currentUser.id || c.receiver_id === currentUser.id); });
    var ids = conns.map(function(c) { return c.requester_id === currentUser.id ? c.receiver_id : c.requester_id; });
    supa.from('profiles').select('id,username,whatsapp').then(function(pr) {
      var profiles = (pr.data || []).filter(function(p) { return ids.indexOf(p.id) > -1; });
      openGroupEditor(group, groupIndex, profiles, function() { renderJournalGroups(); });
    });
  });
}

function openGroupEditor(group, groupIndex, profiles, onSave) {
  var isNew = !group;
  var editGroup = group ? JSON.parse(JSON.stringify(group)) : { name: '', memberIds: [] };

  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:10000;display:flex;align-items:flex-end;';
  var sheet = document.createElement('div');
  sheet.style.cssText = 'background:var(--sf);border-radius:20px 20px 0 0;padding:24px 20px 40px;width:100%;max-height:85vh;overflow-y:auto;';

  var title = document.createElement('div');
  title.style.cssText = 'font-size:0.65rem;font-weight:800;color:var(--ac);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:14px;';
  title.textContent = isNew ? 'New Group' : 'Edit Group';
  sheet.appendChild(title);

  // Name input
  var nameLabel = document.createElement('div');
  nameLabel.style.cssText = 'font-size:0.65rem;font-weight:800;color:var(--ac);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;';
  nameLabel.textContent = 'Group Name';
  sheet.appendChild(nameLabel);
  var nameInput = document.createElement('input');
  nameInput.className = 'input';
  nameInput.style.cssText = 'width:100%;margin-bottom:14px;box-sizing:border-box;';
  nameInput.placeholder = 'e.g. Gratitude Group, Step Work...';
  nameInput.value = editGroup.name;
  sheet.appendChild(nameInput);

  // Save button — at top so you don't have to scroll past all contacts
  var saveBtn = document.createElement('button');
  saveBtn.style.cssText = 'width:100%;margin-bottom:16px;padding:13px;background:var(--ac);border:none;border-radius:10px;color:#1a1208;font-weight:700;cursor:pointer;font-size:0.88rem;';
  saveBtn.textContent = 'Save Group';
  async function doSaveGroup() {
    var name = nameInput.value.trim();
    if (!name) { toast('Please enter a group name'); return; }
    if (!editGroup.memberIds.length) { toast('Please add at least one member'); return; }
    editGroup.name = name;
    try {
      var groupsRes = await supa.from('profiles').select('*').eq('id', currentUser.id).single();
      var groups = (groupsRes.data && groupsRes.data.export_groups) ? groupsRes.data.export_groups : [];
      if (isNew) {
        groups.push(editGroup);
      } else {
        groups[groupIndex] = editGroup;
      }
      await supa.from('profiles').update({ export_groups: groups }).eq('id', currentUser.id);
      document.body.removeChild(overlay);
      if (onSave) onSave();
      toast('Group saved ✓');
    } catch(e) {
      toast('Could not save group: ' + (e.message || e));
    }
  }
  saveBtn.onclick = doSaveGroup;
  sheet.appendChild(saveBtn);

  // Members
  var membersLabel = document.createElement('div');
  membersLabel.style.cssText = 'font-size:0.65rem;font-weight:800;color:var(--ac);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;';
  membersLabel.textContent = 'Members';
  sheet.appendChild(membersLabel);

  profiles.forEach(function(p) {
    (function(profile) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer;-webkit-tap-highlight-color:rgba(232,201,122,0.2);touch-action:manipulation;';
      var cb = document.createElement('div');
      var checked = editGroup.memberIds.indexOf(profile.id) > -1;
      cb.style.cssText = 'width:20px;height:20px;border-radius:50%;border:2px solid '+(checked?'var(--ac)':'rgba(232,201,122,0.3)')+';background:'+(checked?'var(--ac)':'transparent')+';flex-shrink:0;display:flex;align-items:center;justify-content:center;';
      cb.innerHTML = checked ? '<span style="color:#1a1208;font-size:0.7rem;font-weight:900;">&#x2713;</span>' : '';
      var label = document.createElement('div');
      label.style.cssText = 'font-size:0.85rem;';
      label.textContent = (profile.username || 'Member') + (profile.whatsapp ? ' · ' + profile.whatsapp : '');
      row.appendChild(cb);
      row.appendChild(label);

      function toggleMember() {
        var idx = editGroup.memberIds.indexOf(profile.id);
        if (idx > -1) {
          editGroup.memberIds.splice(idx, 1);
          cb.style.border = '2px solid rgba(232,201,122,0.3)';
          cb.style.background = 'transparent';
          cb.innerHTML = '';
        } else {
          editGroup.memberIds.push(profile.id);
          cb.style.border = '2px solid var(--ac)';
          cb.style.background = 'var(--ac)';
          cb.innerHTML = '<span style="color:#1a1208;font-size:0.7rem;font-weight:900;">&#x2713;</span>';
        }
      }

      row.addEventListener('click', toggleMember);
      row.addEventListener('touchend', function(e){ e.preventDefault(); toggleMember(); });
      sheet.appendChild(row);
    })(p);
  });

  // Delete button (edit mode only)
  if (!isNew) {
    var delBtn = document.createElement('button');
    delBtn.style.cssText = 'width:100%;margin-top:8px;padding:11px;background:transparent;border:1px solid rgba(192,57,43,0.4);border-radius:10px;color:#e74c3c;font-weight:600;cursor:pointer;font-size:0.82rem;';
    delBtn.textContent = 'Delete Group';
    delBtn.onclick = async function() {
      var groupsRes2 = await supa.from('profiles').select('*').eq('id', currentUser.id).single();
      var groups = (groupsRes2.data && groupsRes2.data.export_groups) ? groupsRes2.data.export_groups : [];
      groups.splice(groupIndex, 1);
      await supa.from('profiles').update({ export_groups: groups }).eq('id', currentUser.id);
      document.body.removeChild(overlay);
      if (onSave) onSave();
      toast('Group deleted');
    };
    sheet.appendChild(delBtn);
  }

  var cancelBtn = document.createElement('button');
  cancelBtn.style.cssText = 'width:100%;margin-top:8px;padding:11px;background:transparent;border:1px solid var(--bd);border-radius:10px;color:var(--tm);cursor:pointer;font-size:0.82rem;';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = function() { document.body.removeChild(overlay); };
  sheet.appendChild(cancelBtn);

  overlay.appendChild(sheet);
  overlay.onclick = function(e) { if(e.target===overlay) document.body.removeChild(overlay); };
  document.body.appendChild(overlay);
}



// =====================
// 365 DAILY REFLECTIONS
// =====================

function getTodayReflection() {
var now = new Date();
var m = now.getMonth() + 1;
var d = now.getDate();
var found = DAILY_REFLECTIONS.find(function(q){ return q && q.m === m && q.d === d; });
return found || {text: "One day at a time. That's all any of us can do.", m: m, d: d};
}

function cycleQuote() {
var q = getTodayReflection();
var el = document.getElementById('home-quote');
var src = document.getElementById('home-quote-source');
var months = ['','January','February','March','April','May','June','July','August','September','October','November','December'];
if (el) el.textContent = q.text;
if (src) src.textContent = months[q.m] + ' ' + q.d;
}

// =====================
// MOOD PICKER
// =====================

function openMoodPicker() {
var overlay = document.createElement('div');
overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:flex-end;';
var sheet = document.createElement('div');
sheet.style.cssText = 'background:var(--sf);border-radius:20px 20px 0 0;padding:24px 20px 40px;width:100%;max-width:480px;margin:0 auto;';
sheet.innerHTML = '<div style="font-size:0.65rem;font-weight:800;color:var(--ac);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:20px;">How are you feeling today?</div>';
var grid = document.createElement('div');
grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;';
MOODS.forEach(function(mood) {
var btn = document.createElement('button');
btn.style.cssText = 'background:var(--sf2);border:1px solid var(--bd);border-radius:14px;padding:16px 8px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:8px;';
btn.innerHTML = '<span style="font-size:2rem;">' + mood.emoji + '</span><span style="font-size:0.7rem;color:var(--tm);font-weight:600;">' + mood.label + '</span>';
btn.onclick = function() {
saveMood(mood.emoji, mood.label);
document.body.removeChild(overlay);
};
grid.appendChild(btn);
});
sheet.appendChild(grid);
var cancel = document.createElement('button');
cancel.style.cssText = 'width:100%;padding:14px;background:transparent;border:1px solid var(--bd);border-radius:var(--r);color:var(--tm);font-size:0.9rem;cursor:pointer;';
cancel.textContent = 'Cancel';
cancel.onclick = function() { document.body.removeChild(overlay); };
sheet.appendChild(cancel);
overlay.appendChild(sheet);
overlay.onclick = function(e) { if(e.target===overlay) document.body.removeChild(overlay); };
document.body.appendChild(overlay);
}

function saveMood(emoji, label) {
var today = new Date().toISOString().split('T')[0];
var ml = JSON.parse(localStorage.getItem('na_mood_log') || '[]');
ml = ml.filter(function(m){ return m.date !== today; });
ml.push({date: today, mood: emoji, label: label});
if (ml.length > 90) ml = ml.slice(-90);
localStorage.setItem('na_mood_log', JSON.stringify(ml));
updateMoodDisplay(emoji, label);
if (typeof pushToCloud === 'function') pushToCloud();
}

function updateMoodDisplay(emoji, label) {
var face = document.getElementById('mood-face');
var display = document.getElementById('mood-display');
if (face) face.innerHTML = emoji;
if (display) display.textContent = label || 'Tap to update';
}

function loadTodayMood() {
var today = new Date().toISOString().split('T')[0];
var ml = JSON.parse(localStorage.getItem('na_mood_log') || '[]');
var entry = ml.find(function(m){ return m.date === today; });
if (entry) updateMoodDisplay(entry.mood, entry.label);
}

// =====================
// CLEAN TIME FORMATS
// =====================
var cleanTimeFormat = 0;

function cycleCleanTimeFormat() {
cleanTimeFormat = (cleanTimeFormat + 1) % 4;
updateDaysCount();
}

function updateDaysCount() {
var hd = document.getElementById('home-days');
var hm = document.getElementById('home-date-msg');
var dc = document.getElementById('days-count');
var lbl = document.getElementById('clean-date-label');

if (!cleanDate) {
if (hd) hd.textContent = '-';
if (hm) hm.textContent = 'Set your clean date in Account';
if (dc) dc.textContent = '0';
if (lbl) lbl.textContent = '0 days clean';
return;
}

// Calculate days correctly using local date (no timezone shift)
var parts = cleanDate.split('-');
var start = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
var now = new Date();
var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
var totalDays = Math.max(0, Math.floor((today - start) / 86400000));

// Format for home screen
var displayText = '';
var fmt = FORMAT_LABELS[cleanTimeFormat];
if (fmt === 'days') {
displayText = totalDays.toLocaleString();
if (hm) hm.textContent = 'days clean  -  tap to change';
} else if (fmt === 'years-days') {
var years = Math.floor(totalDays / 365);
var rem = totalDays % 365;
displayText = years + 'y ' + rem + 'd';
if (hm) hm.textContent = 'years & days  -  tap to change';
} else if (fmt === 'full') {
var y = Math.floor(totalDays / 365);
var rem2 = totalDays % 365;
var mo = Math.floor(rem2 / 30);
var d = rem2 % 30;
displayText = y + 'y ' + mo + 'm ' + d + 'd';
if (hm) hm.textContent = 'years, months & days  -  tap to change';
} else if (fmt === 'seconds') {
displayText = (totalDays * 86400).toLocaleString();
if (hm) hm.textContent = 'seconds clean  -  tap to change';
}

if (hd) hd.textContent = displayText;

// Also update account screen
if (dc) dc.textContent = totalDays;
if (lbl) lbl.textContent = totalDays === 1 ? '1 day clean' : totalDays.toLocaleString() + ' days clean';
}

function showDailyQuote() {
cycleQuote();
}

function initHomeScreen() {
cycleQuote();
updateDaysCount();
loadTodayMood();
}

// =====================
// PROFILE MANAGEMENT
// =====================
// saveUnifiedProfile — saves to both localStorage (cl_profile) and Supabase profiles table
async function saveUnifiedProfile() {
  var username = (document.getElementById('profile-username') ? document.getElementById('profile-username').value : '').trim();
  var country  = (document.getElementById('profile-country')  ? document.getElementById('profile-country').value  : '').trim();
  var location = (document.getElementById('profile-location') ? document.getElementById('profile-location').value : '').trim();
  var cleandate= document.getElementById('profile-cleandate')  ? document.getElementById('profile-cleandate').value  : '';
  var emailOptIn = document.getElementById('profile-email-opt-in') ? document.getElementById('profile-email-opt-in').checked : true;
  var instagram= (document.getElementById('profile-instagram') ? document.getElementById('profile-instagram').value : '').trim();
  var whatsapp = (document.getElementById('profile-whatsapp')  ? document.getElementById('profile-whatsapp').value  : '').trim();
  var facebook = (document.getElementById('profile-facebook')  ? document.getElementById('profile-facebook').value  : '').trim();
  if (!username) { toast('Please enter a username'); return; }
  // Save locally
  var profile = { username, country, location, cleandate, instagram, whatsapp, facebook };
  localStorage.setItem('cl_profile', JSON.stringify(profile));
  // Update clean date
  if (cleandate) { cleanDate = cleandate; localStorage.setItem('na_clean_date', cleanDate); updateDaysCount(); }
  // Update avatar letter
  var avatarLetter = document.getElementById('account-avatar-letter');
  var homeLetter = document.getElementById('avatar-letter');
  var initial = username.charAt(0).toUpperCase();
  if (avatarLetter) avatarLetter.textContent = initial;
  if (homeLetter && !localStorage.getItem('cl_avatar_url')) homeLetter.textContent = initial;
  // Update account name display
  var nameEl = document.getElementById('account-name');
  if (nameEl) nameEl.textContent = username;
  // Save to Supabase profiles table
  if (supa && currentUser) {
    var existingAvatarUrl = localStorage.getItem('cl_avatar_url') || null;
    var data = { id: currentUser.id, username, country, location, clean_date: cleandate||null, instagram: instagram||null, whatsapp: whatsapp||null, facebook: facebook||null, email_opt_in: emailOptIn };
    if (existingAvatarUrl) data.avatar_url = existingAvatarUrl;
    var upd = await supa.from('profiles').upsert(data, { onConflict: 'id' });
    if (upd.error) {
      console.error('Profile save error:', upd.error);
      toast('Profile save failed — check console');
    }
    myProfile = data;
  }
  if (typeof pushToCloud === 'function') pushToCloud();
  toast('Profile saved \u2713');
}

function previewPendingFlyer(input) {
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var prevImg = document.getElementById('pe-flyer-preview');
    var prevWrap = document.getElementById('pe-flyer-preview-wrap');
    if (prevImg) prevImg.src = e.target.result;
    if (prevWrap) prevWrap.style.display = 'block';
    // Clear URL field since we're using an upload
    var urlField = document.getElementById('pe-flyer-url');
    if (urlField) urlField.value = '';
  };
  reader.readAsDataURL(file);
}
// Keep old saveProfile as alias
function saveProfile() { saveUnifiedProfile(); }

function loadProfile() {
  var profile = JSON.parse(localStorage.getItem('cl_profile') || '{}');
  // Try both old and new field names
  var username = profile.username || profile.firstname || '';
  var country  = profile.country  || '';
  var location = profile.location || profile.region || '';
  var cleandate= profile.cleandate || '';
  var instagram= profile.instagram || '';
  var whatsapp = profile.whatsapp  || '';
  var facebook = profile.facebook  || '';
  var set = function(id, val) { var el = document.getElementById(id); if (el && val) el.value = val; };
  set('profile-username',  username);
  set('profile-country',   country);
  set('profile-location',  location);
  set('profile-cleandate', cleandate);
  set('profile-instagram', instagram);
  set('profile-whatsapp',  whatsapp);
  set('profile-facebook',  facebook);
  // Load email opt-in from Supabase
  if (supa && typeof currentUser !== 'undefined' && currentUser) {
    supa.from('profiles').select('email_opt_in').eq('id', currentUser.id).single().then(function(r) {
      var el = document.getElementById('profile-email-opt-in');
      if (el && r.data) el.checked = r.data.email_opt_in !== false;
    });
  }
  // Update avatar letter
  if (username && !localStorage.getItem('cl_avatar_url')) {
    var avatarEl = document.getElementById('avatar-letter');
    if (avatarEl) avatarEl.textContent = username.charAt(0).toUpperCase();
  }
  // Sync clean date
  if (cleandate && !cleanDate) { cleanDate = cleandate; updateDaysCount(); }
}


// =====================
// MILESTONE CELEBRATIONS
// =====================
function checkMilestoneCelebration(cleanDateStr) {
  if (!cleanDateStr) return;
  try {
    var today = new Date(); today.setHours(0,0,0,0);
    var start = new Date(cleanDateStr); start.setHours(0,0,0,0);
    var d = Math.floor((today-start)/86400000);
    if (d<0) return;
    var m = MILESTONES.find(function(x){return x.days===d;});
    if (!m && d>548) { var y=Math.round(d/365); if(Math.abs(d-(y*365))<=1&&y>=2) { m={days:d,label:y+" Years",keytag:"⭐",message:y>=10?y+" years clean. A life rebuilt, one day at a time, for over a decade. The person you've become is a gift — to yourself and everyone around you.":y+" years. Think about who you were and who you are now. You did that. Keep going."}; } }
    if (!m) return;
    var k='cl_ms_'+m.days+'_'+cleanDateStr;
    if (localStorage.getItem(k)) return;
    localStorage.setItem(k,'1');
    showMilestoneCelebration(m);
  } catch(e){}
}
function showMilestoneCelebration(m) {
  var o=document.getElementById('milestone-overlay'); if(!o) return;
  document.getElementById('milestone-keytag').textContent=m.keytag;
  document.getElementById('milestone-label').textContent=m.label;
  document.getElementById('milestone-message').textContent=m.message;
  o.style.display='flex';
}
function closeMilestone() { var o=document.getElementById('milestone-overlay'); if(o) o.style.display='none'; }

// =====================
// ONBOARDING
// =====================
async function checkOnboarding() {
  if (!currentUser||!supa) return;
  try {
    var r=await supa.from('profiles').select('username,clean_date,country,instagram,whatsapp,facebook').eq('id',currentUser.id).single();
    var p=r.data;
    if (!p||!p.username||!p.clean_date||!p.country||(!p.instagram&&!p.whatsapp&&!p.facebook)) showOnboarding();
  } catch(e) { showOnboarding(); }
}
function showOnboarding() { var el=document.getElementById('onboarding-overlay'); if(el) el.style.display='block'; }
async function saveOnboarding() {
  var name=(document.getElementById('ob-name').value||'').trim();
  var cd=document.getElementById('ob-cleandate').value;
  var country=(document.getElementById('ob-country').value||'').trim();
  var ig=(document.getElementById('ob-instagram').value||'').trim();
  var code=document.getElementById('ob-whatsapp-code').value;
  var raw=(document.getElementById('ob-whatsapp').value||'').trim().replace(/[^0-9]/g,'');
  if(raw.charAt(0)==='0') raw=raw.slice(1);
  var wa=raw?'+'+code+raw:'';
  var fb=(document.getElementById('ob-facebook').value||'').trim();
  if(!name){obMsg('Please enter your name');return;}
  if(!cd){obMsg('Please enter your clean date');return;}
  if(!country){obMsg('Please select your country');return;}
  if(!ig&&!wa&&!fb){obMsg('Please add at least one social link');return;}
  var btn=document.getElementById('ob-submit-btn'); if(btn){btn.textContent='Saving...';btn.disabled=true;}
  if(supa&&currentUser){
    var res=await supa.from('profiles').upsert({id:currentUser.id,username:name,clean_date:cd,country:country,instagram:ig||null,whatsapp:wa||null,facebook:fb||null},{onConflict:'id'});
    if(res.error){obMsg('Save failed — please try again');if(btn){btn.textContent="Let's go 🙏";btn.disabled=false;}return;}
  }
  cleanDate=cd; localStorage.setItem('na_clean_date',cd);
  var pr=JSON.parse(localStorage.getItem('cl_profile')||'{}');
  pr.username=name;pr.cleandate=cd;pr.country=country;pr.instagram=ig;pr.whatsapp=wa;pr.facebook=fb;
  localStorage.setItem('cl_profile',JSON.stringify(pr));
  updateDaysCount();
  var el=document.getElementById('onboarding-overlay'); if(el) el.style.display='none';
  toast('Welcome to Clean Living');
}
function obMsg(msg){var el=document.getElementById('ob-msg');if(el){el.textContent=msg;el.style.display='block';}}

// =====================
// ADMIN EVENT EDITOR
// =====================
var _aeeId=null;
function openAdminEventEditor(ev) {
  _aeeId=ev.id;
  document.getElementById('aee-name').value=ev.name||'';
  document.getElementById('aee-type').value=ev.type||'Other';
  document.getElementById('aee-date').value=ev.date||'';
  document.getElementById('aee-end-date').value=ev.end_date||'';
  document.getElementById('aee-location').value=ev.location||'';
  document.getElementById('aee-country').value=ev.country||'';
  document.getElementById('aee-description').value=ev.description||'';
  document.getElementById('aee-url').value=ev.url||'';
  document.getElementById('aee-flyer-url').value=ev.flyer_url||'';
  document.getElementById('aee-msg').style.display='none';
  var pw=document.getElementById('aee-flyer-preview-wrap');
  var pi=document.getElementById('aee-flyer-preview');
  if(ev.flyer_url){pi.src=ev.flyer_url;pw.style.display='block';}else{pi.src='';pw.style.display='none';}
  document.getElementById('admin-event-editor').style.display='block';
}
function togglePastEvents() {
  window._showPastEvents = !window._showPastEvents;
  var btn = document.getElementById('admin-past-btn');
  if (btn) btn.textContent = window._showPastEvents ? '📅 Hide Past' : '📅 Show Past';
  if (btn) btn.style.background = window._showPastEvents ? 'rgba(232,201,122,0.3)' : 'rgba(232,201,122,0.15)';
  loadEvents();
}
function closeAdminEventEditor(){document.getElementById('admin-event-editor').style.display='none';_aeeId=null;}
function aeeHandlePhoto(input){
  if(!input.files||!input.files[0]) return;
  var r=new FileReader(); r.onload=function(e){document.getElementById('aee-flyer-preview').src=e.target.result;document.getElementById('aee-flyer-preview-wrap').style.display='block';document.getElementById('aee-flyer-url').value='';};
  r.readAsDataURL(input.files[0]);
}
function aeeHandleUrl(url){if(!url) return;document.getElementById('aee-flyer-preview').src=url;document.getElementById('aee-flyer-preview-wrap').style.display='block';}
async function saveAdminEvent(){
  if(!_aeeId) return;
  var name=document.getElementById('aee-name').value.trim();
  var date=document.getElementById('aee-date').value;
  if(!name||!date){aeeMsg('Name and date required');return;}
  var flyerUrl=null;
  var pi=document.getElementById('aee-flyer-preview');
  var uf=document.getElementById('aee-flyer-url').value.trim();
  if(pi&&pi.src&&pi.src.startsWith('data:')) flyerUrl=pi.src;
  else if(uf) flyerUrl=uf;
  var upd={name:name,type:document.getElementById('aee-type').value,date:date,end_date:document.getElementById('aee-end-date').value||null,location:document.getElementById('aee-location').value.trim(),country:document.getElementById('aee-country').value,description:document.getElementById('aee-description').value.trim()||null,url:document.getElementById('aee-url').value.trim()||null,approved:true};
  if(flyerUrl) upd.flyer_url=flyerUrl;
  var res=await supa.from('events').update(upd).eq('id',_aeeId);
  if(res.error){aeeMsg('Save failed: '+res.error.message);return;}
  toast('Event saved');closeAdminEventEditor();loadEvents();
}
async function deleteAdminEvent(){
  if(!_aeeId) return;
  if(!confirm('Delete this event permanently?')) return;
  await supa.from('events').delete().eq('id',_aeeId);
  toast('Event deleted');closeAdminEventEditor();loadEvents();
}
function aeeMsg(msg){var el=document.getElementById('aee-msg');if(el){el.textContent=msg;el.style.display='block';}}


// ============================================================
// MEETING FINDERS — DATA, RENDERING, EMBEDDED LISTS
// ============================================================

function renderMeetingCards(filter) {
  var list = document.getElementById('meeting-finders-list');
  if (!list) return;
  list.innerHTML = '';

  function buildCard(m) {
    var isEmbedded = m.u && m.u.indexOf('#embedded-') === 0;
    var card = document.createElement(isEmbedded ? 'div' : 'a');
    if (!isEmbedded) { card.href = m.u; card.target = '_blank'; }
    else { card.style.cursor = 'pointer'; }
    card.className = 'meeting-card';
    if (m.hl) { card.style.border = '1px solid rgba(212,175,55,0.35)'; card.style.background = 'rgba(212,175,55,0.08)'; }
    var inner = '<div class="meeting-left"><div class="meeting-flag">' + m.f + '</div><div><div class="meeting-title">' + m.n + '</div><div class="meeting-sub">' + m.d + '</div>';
    if (m.x) inner += '<div style="font-size:0.62rem;color:var(--tm);margin-top:3px;">' + m.x + '</div>';
    inner += '</div></div><div class="meeting-arr">' + (isEmbedded ? '▸' : '\u203A') + '</div>';
    card.innerHTML = inner;
    if (isEmbedded) {
      (function(key){ card.addEventListener('click', function(){ openEmbeddedMeetingList(key); }); })(m.u.replace('#embedded-',''));
    }
    return card;
  }

  if (filter === 'all') {
    meetingFinderData.forEach(function(m) {
      if (m.c.indexOf('global') !== -1) list.appendChild(buildCard(m));
    });
    var prompt = document.createElement('div');
    prompt.style.cssText = 'font-size:0.76rem;color:var(--tm);text-align:center;padding:16px 0 6px;line-height:1.5;';
    prompt.textContent = 'Select a country above to find local meetings';
    list.appendChild(prompt);
    return;
  }

  // Pass 1: country-specific cards first (not global)
  meetingFinderData.forEach(function(m) {
    if (m.c.indexOf('global') === -1 && m.c.indexOf(filter) !== -1) {
      list.appendChild(buildCard(m));
    }
  });

  // Pass 2: global/world-wide cards below country results
  meetingFinderData.forEach(function(m) {
    if (m.c.indexOf('global') !== -1) list.appendChild(buildCard(m));
  });

  // Show local guides for selected country
  loadLocalGuides(filter, list);
}
async function loadLocalGuides(filter, container) {
  if (!supa) return;
  try {
    var res = await supa.from('profiles').select('*');
    if (!res.data) return;
    // Map filter value to country names
    var countryMap = {
      'uk':'UK','ireland':'Ireland','usa':'USA','canada':'Canada','mexico':'Mexico',
      'australia':'Australia','newzealand':'New Zealand','southafrica':'South Africa',
      'france':'France','germany':'Germany','spain':'Spain','italy':'Italy','netherlands':'Netherlands',
      'belgium':'Belgium','sweden':'Sweden','norway':'Norway','denmark':'Denmark','finland':'Finland',
      'austria':'Austria','switzerland':'Switzerland','poland':'Poland','czech':'Czech Republic',
      'greece':'Greece','portugal':'Portugal','russia':'Russia','israel':'Israel','uae':'UAE',
      'india':'India','japan':'Japan','brazil':'Brazil','bahamas':'Bahamas','colombia':'Colombia','costarica':'Costa Rica',
      'hawaii':'Hawaii','nepal':'Nepal','hongkong':'Hong Kong','bali':'Bali','iran':'Iran'
    };
    var countryName = countryMap[filter] || filter;
    var guides = res.data.filter(function(p) {
      return p.country_guide && p.country && p.country.toLowerCase() === countryName.toLowerCase();
    });
    if (!guides.length) return;
    var section = document.createElement('div');
    section.style.cssText = 'margin-top:16px;padding:14px;background:rgba(232,201,122,0.05);border:1px solid rgba(232,201,122,0.2);border-radius:12px;';
    var hdr = document.createElement('div');
    hdr.style.cssText = 'font-size:0.65rem;font-weight:800;color:var(--ac);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;';
    hdr.textContent = '\ud83d\udc4b Locals in ' + countryName;
    section.appendChild(hdr);
    var sub = document.createElement('div');
    sub.style.cssText = 'font-size:0.7rem;color:var(--tm);margin-bottom:12px;';
    sub.textContent = 'These members can help you find meetings locally';
    section.appendChild(sub);
    guides.forEach(function(g) {
      var card = document.createElement('div');
      card.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:10px;background:var(--sf);border:1px solid var(--bd);border-radius:8px;margin-bottom:6px;';
      var info = document.createElement('div');
      info.innerHTML = '<span style="font-weight:600;font-size:0.82rem;">' + (g.first_name || g.username || 'Member') + '</span>' +
        (g.region ? ' <span style="font-size:0.7rem;color:var(--tm);">' + g.region + '</span>' : '');
      var btn = document.createElement('button');
      btn.style.cssText = 'padding:6px 12px;border-radius:20px;border:none;background:var(--ac);color:#1a1208;font-size:0.72rem;font-weight:600;cursor:pointer;';
      btn.textContent = '+ Connect';
      (function(uid) { btn.onclick = function() { sendConnectionRequest(uid); }; })(g.id);
      card.appendChild(info);
      card.appendChild(btn);
      section.appendChild(card);
    });
    container.appendChild(section);
  } catch(e) { console.log('Local guides error:', e); }
}

function filterCountryDropdown(term) {
  var sel = document.getElementById('meeting-country-select');
  var list = document.getElementById('meeting-finders-list');
  if (!sel || !list) return;

  if (!term || term.trim() === '') {
    sel.querySelectorAll('option, optgroup').forEach(function(el) { el.style.display = ''; });
    renderMeetingCards(sel.value || 'all');
    return;
  }

  var q = term.trim().toLowerCase();

  // City/region to country mapping
  var cityMap = {
    'london':'uk','manchester':'uk','birmingham':'uk','glasgow':'uk','edinburgh':'uk','liverpool':'uk','leeds':'uk','bristol':'uk','sheffield':'uk','cardiff':'uk','belfast':'uk','brighton':'uk','nottingham':'uk','coventry':'uk','leicester':'uk',
    'dublin':'ireland','cork':'ireland','galway':'ireland',
    'toronto':'canada','vancouver':'canada','montreal':'canada','calgary':'canada','ottawa':'canada','edmonton':'canada','winnipeg':'canada',
    'new york':'usa','los angeles':'usa','chicago':'usa','houston':'usa','phoenix':'usa','philadelphia':'usa','san antonio':'usa','san diego':'usa','dallas':'usa','san jose':'usa','austin':'usa','jacksonville':'usa','miami':'usa','seattle':'usa','denver':'usa','boston':'usa','nashville':'usa','portland':'usa','las vegas':'usa','detroit':'usa','memphis':'usa','atlanta':'usa',
    'sydney':'australia','melbourne':'australia','brisbane':'australia','perth':'australia','adelaide':'australia',
    'paris':'france','marseille':'france','lyon':'france','toulouse':'france','nice':'france','nantes':'france','bordeaux':'france',
    'berlin':'germany','hamburg':'germany','munich':'germany','cologne':'germany','frankfurt':'germany','stuttgart':'germany','dusseldorf':'germany','vienna':'austria',
    'madrid':'spain','barcelona':'spain','seville':'spain','valencia':'spain','bilbao':'spain',
    'rome':'italy','milan':'italy','naples':'italy','turin':'italy','florence':'italy',
    'amsterdam':'netherlands','rotterdam':'netherlands','the hague':'netherlands',
    'brussels':'belgium','antwerp':'belgium',
    'stockholm':'sweden','gothenburg':'sweden','malmo':'sweden',
    'oslo':'norway','bergen':'norway',
    'copenhagen':'denmark','aarhus':'denmark',
    'helsinki':'finland','tampere':'finland',
    'zurich':'switzerland','geneva':'switzerland','basel':'switzerland',
    'warsaw':'poland','krakow':'poland','wroclaw':'poland',
    'prague':'czech','brno':'czech',
    'athens':'greece','thessaloniki':'greece',
    'lisbon':'portugal','porto':'portugal',
    'bucharest':'romania','cluj':'romania',
    'tokyo':'japan','osaka':'japan','kyoto':'japan','yokohama':'japan','nagoya':'japan','fukuoka':'japan','sapporo':'japan',
    'mumbai':'india','delhi':'india','bangalore':'india','hyderabad':'india','chennai':'india','kolkata':'india','pune':'india',
    'cape town':'southafrica','johannesburg':'southafrica','durban':'southafrica','pretoria':'southafrica',
    'auckland':'newzealand','wellington':'newzealand','christchurch':'newzealand',
    'tel aviv':'israel','jerusalem':'israel','haifa':'israel',
    'dubai':'uae','abu dhabi':'uae',
    'bangkok':'thailand','chiang mai':'thailand','phuket':'thailand',
    'ho chi minh':'vietnam','hanoi':'vietnam',
    'mexico city':'mexico','guadalajara':'mexico','monterrey':'mexico',
    'sao paulo':'brazil','rio de janeiro':'brazil','brasilia':'brazil',
    'cairo':'egypt','alexandria':'egypt',
    'kathmandu':'nepal','singapore':'singapore','hong kong':'hongkong',
    'bali':'bali','denpasar':'bali','reykjavik':'iceland',
    'riga':'latvia','vilnius':'lithuania',
    'zagreb':'croatia','ljubljana':'slovenia','belgrade':'serbia',
    'budapest':'hungary','kyiv':'ukraine','lviv':'ukraine',
    'istanbul':'turkey','ankara':'turkey',
    'moscow':'russian','st petersburg':'russian',
    'honolulu':'hawaii','maui':'hawaii'
  };

  var cityCountry = null;
  Object.keys(cityMap).forEach(function(city) {
    if (city.includes(q) || q.includes(city)) {
      cityCountry = cityMap[city];
    }
  });

  if (cityCountry) {
    sel.value = cityCountry;
    sel.querySelectorAll('option, optgroup').forEach(function(el) { el.style.display = ''; });
    renderMeetingCards(cityCountry);
    return;
  }

  // Step 1 — try to match a country in the dropdown first
  var firstCountryMatch = null;
  var groups = sel.querySelectorAll('optgroup');
  groups.forEach(function(grp) {
    var grpOptions = grp.querySelectorAll('option');
    var anyVisible = false;
    grpOptions.forEach(function(opt) {
      if (opt.textContent.toLowerCase().includes(q)) {
        opt.style.display = '';
        anyVisible = true;
        if (!firstCountryMatch) firstCountryMatch = opt.value;
      } else {
        opt.style.display = 'none';
      }
    });
    grp.style.display = anyVisible ? '' : 'none';
  });
  var topOptions = Array.from(sel.children).filter(function(el) { return el.tagName === 'OPTION'; });
  topOptions.forEach(function(opt) {
    if (opt.textContent.toLowerCase().includes(q)) {
      opt.style.display = '';
      if (!firstCountryMatch) firstCountryMatch = opt.value;
    } else {
      opt.style.display = 'none';
    }
  });

  // Step 2 — also search across all meeting card names and descriptions
  var cardMatches = meetingFinderData.filter(function(m) {
    return (m.n && m.n.toLowerCase().includes(q)) ||
           (m.d && m.d.toLowerCase().includes(q)) ||
           (m.x && m.x.toLowerCase().includes(q));
  });

  // If we got card matches, show them directly
  if (cardMatches.length > 0) {
    list.innerHTML = '';
    cardMatches.forEach(function(m) {
      var isEmbedded = m.u && m.u.indexOf('#embedded-') === 0;
      var card = document.createElement(isEmbedded ? 'div' : 'a');
      if (!isEmbedded) { card.href = m.u; card.target = '_blank'; }
      else { card.style.cursor = 'pointer'; }
      card.className = 'meeting-card';
      if (m.hl) { card.style.border = '1px solid rgba(212,175,55,0.35)'; card.style.background = 'rgba(212,175,55,0.08)'; }
      var inner = '<div class="meeting-left"><div class="meeting-flag">' + m.f + '</div><div><div class="meeting-title">' + m.n + '</div><div class="meeting-sub">' + m.d + '</div>';
      if (m.x) inner += '<div style="font-size:0.62rem;color:var(--tm);margin-top:3px;">' + m.x + '</div>';
      inner += '</div></div><div class="meeting-arr">' + (isEmbedded ? '▸' : '›') + '</div>';
      card.innerHTML = inner;
      if (isEmbedded) {
        (function(key){ card.addEventListener('click', function(){ openEmbeddedMeetingList(key); }); })(m.u.replace('#embedded-',''));
      }
      list.appendChild(card);
    });
    // If country also matched, still select it in dropdown
    if (firstCountryMatch) sel.value = firstCountryMatch;
    return;
  }

  // Step 3 — fall back to country match only
  if (firstCountryMatch) {
    sel.value = firstCountryMatch;
    renderMeetingCards(firstCountryMatch);
  } else {
    // Nothing matched at all
    list.innerHTML = '<div style="font-size:0.76rem;color:var(--tm);text-align:center;padding:20px 0;">No results found — try the NA World Meeting Search above</div>';
  }
}

function initMeetingsTab() {
  var sel = document.getElementById('meeting-country-select');
  if (!sel) return;
  var profileCountry = localStorage.getItem('cl_profile_country');
  if (profileCountry) {
    var cm = {'United Kingdom':'uk','UK':'uk','England':'uk','Scotland':'uk','Wales':'uk','Northern Ireland':'uk','Ireland':'ireland','USA':'usa','United States':'usa','Canada':'canada','Australia':'australia','New Zealand':'newzealand','South Africa':'southafrica','India':'india','Germany':'germany','Austria':'germany','France':'france','Spain':'spain','Italy':'italy','Netherlands':'netherlands','Sweden':'sweden','Norway':'norway','Denmark':'denmark','Finland':'finland','Belgium':'belgium','Switzerland':'switzerland','Poland':'poland','Greece':'greece','Portugal':'portugal','Turkey':'turkey','Japan':'japan','Thailand':'thailand','Singapore':'singapore','Hong Kong':'hongkong','Israel':'israel','Iran':'iran','Saudi Arabia':'saudiarabia','Egypt':'egypt','Mexico':'mexico','Hungary':'hungary','Iceland':'iceland','Czech Republic':'czech','Romania':'romania','Bulgaria':'bulgaria','Croatia':'croatia','Serbia':'serbia','Slovenia':'slovenia','Ukraine':'ukraine','Latvia':'latvia','Lithuania':'lithuania','Malta':'malta','Moldova':'moldova','Bali':'bali','Vietnam':'vietnam'};
    var mapped = cm[profileCountry];
    if (mapped) sel.value = mapped;
  }
  sel.addEventListener('change', function() { renderMeetingCards(this.value); });
  renderMeetingCards(sel.value);
  // Wire up overlay back button
  var backBtn = document.getElementById('meeting-list-back-btn');
  if (backBtn) backBtn.addEventListener('click', closeEmbeddedMeetingList);
}

function openEmbeddedMeetingList(key) {
  var overlay = document.getElementById('meeting-list-overlay');
  var titleEl = document.getElementById('meeting-list-title');
  var contentEl = document.getElementById('meeting-list-content');
  if (!overlay) return;
  var data = null;
  if (key === 'nz') data = {title:'New Zealand Meetings',helpline:'<a href="tel:0800628632" style="color:var(--ac);">0800 NA TODAY (628 632)</a> · <a href="https://www.nzna.org" target="_blank" style="color:var(--ac);">nzna.org</a>',meetings:nzMeetings};
  else if (key === 'japan') data = {title:'Japan Meetings (English)',helpline:'NA Japan: <a href="tel:+81339028869" style="color:var(--ac);">03-3902-8869</a> (Sat 1-5pm) · <a href="https://najapan.org/pdf/NALIST_J.pdf" target="_blank" style="color:var(--ac);">Full list in Japanese</a>',meetings:japanMeetings};
  else if (key === 'malta') data = {title:'Malta / Gozo Meetings',helpline:'Helpline: <a href="tel:+35679466566" style="color:var(--ac);">+356 7946 6566</a> · Zoom ID: 208 850 0955 · PW: jftmalta',meetings:maltaMeetings};
  if (!data) return;
  titleEl.textContent = data.title;
  var days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  var byDay = {}; days.forEach(function(d){ byDay[d] = []; });
  data.meetings.forEach(function(m){ if(byDay[m.day]) byDay[m.day].push(m); });
  var h = '<div style="font-size:0.72rem;color:var(--tm);margin-bottom:14px;line-height:1.5;">' + data.helpline + '</div>';
  days.forEach(function(day){
    var ms = byDay[day]; if(!ms.length) return;
    h += '<div style="margin-bottom:16px;"><div style="font-size:0.88rem;font-weight:700;color:var(--ac);margin-bottom:8px;border-bottom:1px solid var(--bd);padding-bottom:4px;">' + day + '</div>';
    ms.forEach(function(m){
      h += '<div style="background:var(--sf);border:1px solid var(--bd);border-radius:8px;padding:10px 12px;margin-bottom:6px;">';
      h += '<div style="display:flex;justify-content:space-between;align-items:flex-start;">';
      h += '<div style="font-size:0.8rem;font-weight:600;color:var(--tx);">' + m.name + '</div>';
      h += '<div style="font-size:0.75rem;color:var(--ac);font-weight:600;white-space:nowrap;margin-left:8px;">' + m.time + '</div></div>';
      if(m.venue) h += '<div style="font-size:0.72rem;color:var(--tm);margin-top:2px;">' + m.venue + '</div>';
      if(m.addr) h += '<div style="font-size:0.68rem;color:var(--tm);margin-top:1px;">' + m.addr + '</div>';
      var tags = []; if(m.type) tags.push(m.type); if(m.region) tags.push(m.region);
      if(tags.length) h += '<div style="font-size:0.62rem;color:var(--ac);margin-top:4px;">' + tags.join(' \u00B7 ') + '</div>';
      h += '</div>';
    });
    h += '</div>';
  });
  contentEl.innerHTML = h;
  overlay.style.display = 'block';
  overlay.scrollTop = 0;
  document.body.style.overflow = 'hidden';
}

// ============================================================
// ADMIN STATS DASHBOARD
// ============================================================
async function toggleLocalGuide() {
  if (!supa || !currentUser) return;
  var toggle = document.getElementById('guide-toggle');
  var dot = document.getElementById('guide-toggle-dot');
  var isOn = toggle.dataset.on === 'true';
  var newVal = !isOn;
  var res = await supa.from('profiles').update({ country_guide: newVal }).eq('id', currentUser.id);
  if (res.error) { console.error('Guide toggle error:', res.error); toast('Could not save — try again'); return; }
  toggle.dataset.on = newVal;
  if (newVal) {
    toggle.style.background = 'var(--ac)';
    dot.style.left = '23px';
  } else {
    toggle.style.background = 'var(--bd)';
    dot.style.left = '3px';
  }
  toast(newVal ? 'You are now listed as a Local in your country' : 'Removed from Locals');
}
function loadGuideState() {
  if (!myProfile) return;
  var toggle = document.getElementById('guide-toggle');
  var dot = document.getElementById('guide-toggle-dot');
  if (!toggle || !dot) return;
  var isOn = myProfile.country_guide ? true : false;
  toggle.dataset.on = isOn;
  if (isOn) {
    toggle.style.background = 'var(--ac)';
    dot.style.left = '23px';
  }
}
async function toggleWelcomeEmail(userId, btn, newVal) {
  if (!supa) return;
  var result = await supa.from('profiles').update({ welcome_email_sent: newVal }).eq('id', userId);
  if (result && result.error) { toast('Could not update'); return; }
  if (newVal) {
    // Remove from unsent list if present
    var row = btn.closest('[data-unsent-row]');
    if (row) {
      row.remove();
      // Check if list is now empty
      var ueList = document.getElementById('adm-unsent-email-list');
      if (ueList && !ueList.querySelector('[data-unsent-row]')) {
        ueList.innerHTML = '<div style="font-size:0.76rem;color:var(--tm);padding:10px 0;">All members have been emailed ✓</div>';
        return;
      }
    }
    // Update button in new members list
    btn.textContent = '✉️ Sent';
    btn.style.borderColor = 'rgba(95,207,128,0.3)';
    btn.style.background = 'rgba(95,207,128,0.1)';
    btn.style.color = '#5fcf80';
    btn.setAttribute('onclick', "toggleWelcomeEmail('" + userId + "',this,false)");
  } else {
    btn.textContent = '📧 Mark sent';
    btn.style.borderColor = 'rgba(232,201,122,0.3)';
    btn.style.background = 'transparent';
    btn.style.color = 'var(--tm)';
    btn.setAttribute('onclick', "toggleWelcomeEmail('" + userId + "',this,true)");
  }
}
async function loadAdminStats() {
  if (!supa || !isAdmin()) return;
  try {
    var res = await supa.from('profiles').select('*');
    if (res.error) { console.error('Admin stats error:', res.error); return; }
    if (!res.data) return;
    var profiles = res.data;
    var now = Date.now();
    var fiveMin = 5 * 60 * 1000;
    var oneDay = 24 * 60 * 60 * 1000;
    var oneWeek = 7 * oneDay;
    var oneMonth = 30 * oneDay;
    var total = profiles.length;
    var onlineNow = 0, activeToday = 0, activeWeek = 0, activeMonth = 0, newWeek = 0;
    var onlineMembers = [];
    var newMembers = [];
    profiles.forEach(function(p) {
      if (p.last_seen) {
        var diff = now - new Date(p.last_seen).getTime();
        if (diff < fiveMin) { onlineNow++; onlineMembers.push(p); }
        if (diff < oneDay) activeToday++;
        if (diff < oneWeek) activeWeek++;
        if (diff < oneMonth) activeMonth++;
      }
      if (p.created_at) {
        var created = now - new Date(p.created_at).getTime();
        if (created < oneWeek) newWeek++;
        if (created < oneWeek) newMembers.push(p);
      }
    });
    var el = function(id) { return document.getElementById(id); };
    if (el('adm-total-users')) el('adm-total-users').textContent = total;
    if (el('adm-online-now')) el('adm-online-now').textContent = onlineNow;
    if (el('adm-active-today')) el('adm-active-today').textContent = activeToday;
    if (el('adm-active-week')) el('adm-active-week').textContent = activeWeek;
    if (el('adm-active-month')) el('adm-active-month').textContent = activeMonth;
    if (el('adm-new-week')) el('adm-new-week').textContent = newWeek;
    var t = new Date();
    if (el('adm-last-updated')) el('adm-last-updated').textContent = 'Updated ' + t.getHours().toString().padStart(2,'0') + ':' + t.getMinutes().toString().padStart(2,'0');
    // Render new members list
    var nmList = el('adm-new-members-list');
    if (nmList) {
      if (!newMembers.length) { nmList.innerHTML = '<div style="font-size:0.76rem;color:var(--tm);padding:10px 0;">No new members this week</div>'; }
      else {
        newMembers.sort(function(a,b){ return new Date(b.created_at) - new Date(a.created_at); });
        var h = '';
        newMembers.forEach(function(m){
          var diff = now - new Date(m.created_at).getTime();
          var mins = Math.floor(diff/60000);
          var when = mins < 60 ? mins+'m ago' : mins < 1440 ? Math.floor(mins/60)+'h ago' : Math.floor(mins/1440)+'d ago';
          var loc = [m.region, m.country].filter(Boolean).join(', ');
          var emSent = m.welcome_email_sent ? true : false;
          h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--sf);border:1px solid var(--bd);border-radius:8px;margin-bottom:6px;">';
          h += '<div><span style="font-weight:600;font-size:0.82rem;">' + (m.first_name || m.username || m.email || 'No name') + '</span>';
          if (loc) h += ' <span style="font-size:0.7rem;color:var(--tm);">' + loc + '</span>';
          h += '</div><div style="display:flex;align-items:center;gap:6px;"><button onclick="toggleWelcomeEmail(\'' + m.id + '\',this,' + !emSent + ')" style="padding:3px 8px;border-radius:12px;border:1px solid ' + (emSent ? 'rgba(95,207,128,0.3)' : 'rgba(232,201,122,0.3)') + ';background:' + (emSent ? 'rgba(95,207,128,0.1)' : 'transparent') + ';color:' + (emSent ? '#5fcf80' : 'var(--tm)') + ';font-size:0.6rem;cursor:pointer;">' + (emSent ? '✉️ Sent' : '📧 Not sent') + '</button><div style="font-size:0.68rem;color:var(--ac);white-space:nowrap;">' + when + '</div></div></div>';
        });
        nmList.innerHTML = h;
      }
    }
    // Render online list
    var olList = el('adm-online-list');
    if (olList) {
      if (!onlineMembers.length) { olList.innerHTML = '<div style="font-size:0.76rem;color:var(--tm);padding:10px 0;">No one online right now</div>'; }
      else {
        var h = '';
        onlineMembers.forEach(function(m){
          var loc = [m.region, m.country].filter(Boolean).join(', ');
          h += '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--sf);border:1px solid var(--bd);border-radius:8px;margin-bottom:6px;">';
          h += '<div style="width:8px;height:8px;border-radius:50%;background:#2ecc71;flex-shrink:0;"></div>';
          h += '<div><span style="font-weight:600;font-size:0.82rem;">' + (m.first_name || m.username || m.email || 'No name') + '</span>';
          if (loc) h += ' <span style="font-size:0.7rem;color:var(--tm);">' + loc + '</span>';
          h += '</div></div>';
        });
        olList.innerHTML = h;
      }
    }
    // Render unsent welcome email list
    var ueList = el('adm-unsent-email-list');
    if (ueList) {
      var unsent = profiles.filter(function(p) { return !p.welcome_email_sent; });
      if (!unsent.length) { ueList.innerHTML = '<div style="font-size:0.76rem;color:var(--tm);padding:10px 0;">All members have been emailed ✓</div>'; }
      else {
        var h = '';
        unsent.forEach(function(m){
          var loc = [m.region, m.country].filter(Boolean).join(', ');
          var email = m.email || '';
          h += '<div data-unsent-row style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--sf);border:1px solid var(--bd);border-radius:8px;margin-bottom:6px;">';
          h += '<div>';
          if (email) {
            h += '<a href="mailto:' + email + '?subject=Welcome to Clean Living 🌿&body=Hi ' + (m.first_name || '') + '," style="font-weight:600;font-size:0.82rem;color:var(--ac);text-decoration:none;">' + (m.first_name || m.username || email || 'No name') + ' ✉️</a>';
          } else {
            h += '<span style="font-weight:600;font-size:0.82rem;">' + (m.first_name || m.username || 'No name') + '</span>';
          }
          if (loc) h += ' <span style="font-size:0.7rem;color:var(--tm);">' + loc + '</span>';
          if (email) h += '<div style="font-size:0.6rem;color:var(--tm);margin-top:2px;">' + email + '</div>';
          h += '</div><button onclick="toggleWelcomeEmail(\'' + m.id + '\',this,true)" style="padding:3px 8px;border-radius:12px;border:1px solid rgba(232,201,122,0.3);background:transparent;color:var(--tm);font-size:0.6rem;cursor:pointer;flex-shrink:0;">📧 Mark sent</button></div>';
        });
        ueList.innerHTML = '<div style="font-size:0.7rem;color:var(--tm);margin-bottom:8px;">' + unsent.length + ' member' + (unsent.length !== 1 ? 's' : '') + ' not yet emailed</div>' + h;
      }
    }
  } catch(e) { console.error('Admin stats error:', e); }
}

// ============================================================
// NETWORK ONLINE COUNT
// ============================================================
async function updateNetworkOnlineCount() {
  var countEl = document.getElementById('network-online-count');
  if (!countEl || !supa) return;
  try {
    var res = await supa.from('profiles').select('id,last_seen');
    if (res.error || !res.data) { countEl.textContent = ''; return; }
    var now = Date.now();
    var fiveMin = 5 * 60 * 1000;
    var online = 0;
    var total = res.data.length;
    res.data.forEach(function(p) {
      if (p.last_seen && (now - new Date(p.last_seen).getTime()) < fiveMin) online++;
    });
    if (online > 0) {
      countEl.innerHTML = '🟢 <span style="color:var(--ac);font-weight:600;">' + online + '</span> member' + (online !== 1 ? 's' : '') + ' online now · ' + total + ' total members';
    } else {
      countEl.textContent = total + ' members · No one online right now';
    }
  } catch(e) { countEl.textContent = ''; }
}

// ============================================================
// SAVED EVENT SOURCES
// ============================================================
function getSavedSources() {
  try { return JSON.parse(localStorage.getItem('cl_event_sources') || '[]'); }
  catch(e) { return []; }
}
function saveSources(sources) {
  localStorage.setItem('cl_event_sources', JSON.stringify(sources));
}
function addSavedSource() {
  var urlEl = document.getElementById('adm-new-source-url');
  var labelEl = document.getElementById('adm-new-source-label');
  var url = urlEl ? urlEl.value.trim() : '';
  var label = labelEl ? labelEl.value.trim() : '';
  if (!url) { toast('Please enter a URL'); return; }
  if (!url.startsWith('http')) { toast('URL must start with https://'); return; }
  var sources = getSavedSources();
  // Check if already saved
  if (sources.some(function(s){ return s.url === url; })) { toast('This URL is already saved'); return; }
  sources.push({ url: url, label: label || url, lastImported: null, addedAt: new Date().toISOString() });
  saveSources(sources);
  if (urlEl) urlEl.value = '';
  if (labelEl) labelEl.value = '';
  renderSavedSources();
  toast('Source saved');
}
function removeSavedSource(idx) {
  var sources = getSavedSources();
  sources.splice(idx, 1);
  saveSources(sources);
  renderSavedSources();
}
function renderSavedSources() {
  var container = document.getElementById('adm-saved-sources');
  if (!container) return;
  var sources = getSavedSources();
  if (!sources.length) {
    container.innerHTML = '<div style="font-size:0.76rem;color:var(--tm);padding:8px 0;">No saved sources yet</div>';
    return;
  }
  var h = '';
  sources.forEach(function(src, i) {
    var lastRun = src.lastImported ? new Date(src.lastImported) : null;
    var daysSince = lastRun ? Math.floor((Date.now() - lastRun.getTime()) / (24*60*60*1000)) : null;
    var overdue = daysSince === null || daysSince >= 30;
    h += '<div style="background:var(--sf);border:1px solid ' + (overdue ? 'rgba(231,76,60,0.4)' : 'var(--bd)') + ';border-radius:8px;padding:10px 12px;margin-bottom:6px;">';
    h += '<div style="display:flex;justify-content:space-between;align-items:flex-start;">';
    h += '<div style="flex:1;min-width:0;">';
    h += '<div style="font-weight:600;font-size:0.8rem;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + src.label + '</div>';
    h += '<div style="font-size:0.65rem;color:var(--tm);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + src.url + '</div>';
    if (lastRun) {
      h += '<div style="font-size:0.65rem;color:' + (overdue ? '#e74c3c' : 'var(--tm)') + ';margin-top:3px;">';
      h += overdue ? '⚠️ Last imported ' + daysSince + ' days ago — due for refresh' : '✅ Imported ' + daysSince + ' day' + (daysSince !== 1 ? 's' : '') + ' ago';
      h += '</div>';
    } else {
      h += '<div style="font-size:0.65rem;color:#e74c3c;margin-top:3px;">⚠️ Never imported</div>';
    }
    h += '</div>';
    h += '<div style="display:flex;gap:6px;margin-left:8px;flex-shrink:0;">';
    h += '<button onclick="runSavedSource(' + i + ')" style="background:var(--ac);border:none;border-radius:6px;padding:5px 10px;font-size:0.65rem;font-weight:700;color:#1a1208;cursor:pointer;">Import</button>';
    h += '<button onclick="removeSavedSource(' + i + ')" style="background:transparent;border:1px solid rgba(231,76,60,0.4);border-radius:6px;padding:5px 8px;font-size:0.65rem;color:#e74c3c;cursor:pointer;">✕</button>';
    h += '</div></div></div>';
  });
  container.innerHTML = h;
}
function runSavedSource(idx) {
  var sources = getSavedSources();
  var src = sources[idx];
  if (!src) return;
  // Switch to events tab, open admin panel, populate URL and trigger import
  showScreen('events');
  setTimeout(function() {
    openAdminPanel();
    setTimeout(function() {
      setBulkMode('url');
      var urlEl = document.getElementById('bulk-import-url');
      if (urlEl) urlEl.value = src.url;
      bulkImportEvents().then(function() {
        // Update last imported timestamp
        var srcs = getSavedSources();
        if (srcs[idx]) {
          srcs[idx].lastImported = new Date().toISOString();
          saveSources(srcs);
        }
      });
    }, 300);
  }, 300);
}
function checkOverdueSources() {
  if (!isAdmin()) return;
  var sources = getSavedSources();
  var overdue = sources.filter(function(s) {
    if (!s.lastImported) return true;
    return (Date.now() - new Date(s.lastImported).getTime()) >= 30 * 24 * 60 * 60 * 1000;
  });
  if (overdue.length > 0) {
    setTimeout(function() {
      toast(overdue.length + ' event source' + (overdue.length !== 1 ? 's' : '') + ' due for refresh — check Admin tab');
    }, 4000);
  }
}

function closeEmbeddedMeetingList() {
  var overlay = document.getElementById('meeting-list-overlay');
  if(overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
}

// ============================================================
// MALTA MEETINGS
// ============================================================

// ── ADMIN SECTION TOGGLE ─────────────────────────────────────────
var WORKER_URL = 'https://clarelivingapp.clare-monahan.workers.dev';

// ── ADMIN SECTION TOGGLE ─────────────────────────────────────────
// ── ADMIN SECTION TOGGLE ─────────────────────────────────────────
function toggleAdmSection(id, chevronId) {
  var el = document.getElementById(id);
  var ch = document.getElementById(chevronId);
  if (!el) return;
  var open = el.style.display !== 'none';
  el.style.display = open ? 'none' : 'block';
  if (ch) ch.style.transform = open ? '' : 'rotate(90deg)';
}
// ─────────────────────────────────────────────────────────────────

// ── BMLT LIVE MEETING FINDER ──────────────────────────────────────

async function bmltFindNearMe() {
  var btn = document.getElementById('bmlt-locate-btn');
  var statusEl = document.getElementById('bmlt-status');
  var resultsEl = document.getElementById('bmlt-results');
  btn.disabled = true;
  btn.textContent = '📍 Getting your location…';
  statusEl.style.display = 'block';
  statusEl.textContent = '';
  resultsEl.innerHTML = '';

  if (!navigator.geolocation) {
    statusEl.textContent = 'Location not available on this device.';
    btn.disabled = false; btn.textContent = '📍 Find meetings near me';
    return;
  }

  navigator.geolocation.getCurrentPosition(async function(pos) {
    var lat = pos.coords.latitude, lng = pos.coords.longitude;
    statusEl.textContent = 'Finding meetings near you…';

    try {
      // Reverse geocode via Worker
      var geoRes = await fetch(WORKER_URL, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ fetchUrl: 'https://nominatim.openstreetmap.org/reverse?lat=' + lat + '&lon=' + lng + '&format=json&accept-language=en' })
      });
      var geoData = await geoRes.json();
      var geoInfo = JSON.parse(geoData.html);
      var cc = geoInfo.address && geoInfo.address.country_code ? geoInfo.address.country_code.toLowerCase() : '';
      var countryName = geoInfo.address && geoInfo.address.country ? geoInfo.address.country : 'your location';
      var city = geoInfo.address && (geoInfo.address.city || geoInfo.address.town || geoInfo.address.village) || '';

      // Pick BMLT server
      var serverUrl = null;
      if (cc === 'us') {
        for (var i = 0; i < BMLT_US_SERVERS.length; i++) {
          var s = BMLT_US_SERVERS[i];
          if (lat >= s.minLat && lat <= s.maxLat && lng >= s.minLng && lng <= s.maxLng) {
            serverUrl = s.url; break;
          }
        }
        if (!serverUrl) serverUrl = 'https://bmlt.wszf.org/main_server';
      } else if (BMLT_SERVERS[cc]) {
        serverUrl = BMLT_SERVERS[cc];
      }

      if (!serverUrl) {
        statusEl.textContent = '';
        var postcode = geoInfo.address && geoInfo.address.postcode ? geoInfo.address.postcode : '';
        var finder = COUNTRY_FINDERS[cc];
        if (finder) {
          var finderUrl = finder.url;
          if (finder.postcode_param && postcode) {
            finderUrl += (finderUrl.indexOf('?') > -1 ? '&' : '?') + finder.postcode_param + '=' + encodeURIComponent(postcode);
          }
          resultsEl.innerHTML =
            '<a href="' + finderUrl + '" target="_blank" class="meeting-card" style="margin-bottom:8px;">' +
              '<div class="meeting-left">' +
                '<div class="meeting-flag">📍</div>' +
                '<div>' +
                  '<div class="meeting-title">' + finder.label + '</div>' +
                  '<div class="meeting-sub">' + (postcode ? 'Searching near ' + postcode + ' · ' : '') + 'Tap to find meetings in ' + finder.name + '</div>' +
                '</div>' +
              '</div>' +
              '<div class="meeting-arr">›</div>' +
            '</a>';
        } else {
          resultsEl.innerHTML =
            '<a href="https://na.org/meetingsearch/" target="_blank" class="meeting-card">' +
              '<div class="meeting-left">' +
                '<div class="meeting-flag">🌍</div>' +
                '<div>' +
                  '<div class="meeting-title">NA World Meeting Search</div>' +
                  '<div class="meeting-sub">Find meetings near ' + (city || countryName) + '</div>' +
                '</div>' +
              '</div>' +
              '<div class="meeting-arr">›</div>' +
            '</a>';
        }
        btn.disabled = false; btn.textContent = '📍 Search again';
        return;
      }

      statusEl.textContent = 'Searching for meetings near ' + (city || countryName) + '…';

      // Query BMLT
      var bmltUrl = serverUrl + '/client_interface/json/?switcher=GetSearchResults' +
        '&lat_val=' + lat + '&long_val=' + lng +
        '&geo_width=20&sort_key=time' +
        '&data_field_key=meeting_name,location_text,location_street,location_municipality,weekday_tinyint,start_time,formats,virtual_meeting_link';

      var bmltRes = await fetch(WORKER_URL, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ fetchUrl: bmltUrl })
      });
      var bmltData = await bmltRes.json();
      var meetings = JSON.parse(bmltData.html);
      statusEl.textContent = '';

      if (!meetings || meetings.length === 0) {
        resultsEl.innerHTML =
          '<div style="background:var(--sf);border:1px solid var(--bd);border-radius:var(--r);padding:16px;text-align:center;">' +
            '<div style="font-size:0.84rem;color:var(--tx);font-weight:600;margin-bottom:6px;">No meetings found within 20 miles</div>' +
            '<div style="font-size:0.72rem;color:var(--tm);">Try the NA World Meeting Search below to widen your search.</div>' +
          '</div>';
      } else {
        var html = '<div style="font-size:0.65rem;font-weight:800;color:var(--ac);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">' +
          meetings.length + ' meeting' + (meetings.length !== 1 ? 's' : '') + ' near ' + (city || countryName) + '</div>';

        meetings.slice(0, 15).forEach(function(m) {
          var dayIdx = (parseInt(m.weekday_tinyint) || 1) - 1;
          var day = BMLT_DAYS[dayIdx] || '';
          var time = '';
          if (m.start_time) {
            var parts = m.start_time.split(':');
            var h = parseInt(parts[0]), mn = parts[1] || '00';
            var ampm = h >= 12 ? 'pm' : 'am';
            h = h % 12 || 12;
            time = h + ':' + mn + ampm;
          }
          var venue = [m.location_text, m.location_street, m.location_municipality].filter(Boolean).join(', ');
          var isOnline = m.virtual_meeting_link && m.virtual_meeting_link.length > 0;
          html +=
            '<div class="meeting-card" style="margin-bottom:8px;">' +
              '<div class="meeting-left">' +
                '<div class="meeting-flag">' + (isOnline ? '💻' : '📍') + '</div>' +
                '<div>' +
                  '<div class="meeting-title">' + (m.meeting_name || 'NA Meeting') + '</div>' +
                  '<div class="meeting-sub">' + day + (time ? ' ' + time : '') + (venue ? ' · ' + venue : '') + '</div>' +
                '</div>' +
              '</div>' +
            '</div>';
        });
        if (meetings.length > 15) {
          html += '<div style="font-size:0.72rem;color:var(--tm);text-align:center;padding:8px 0;">Showing 15 of ' + meetings.length + ' meetings — search on NA World Meeting Search for more</div>';
        }
        resultsEl.innerHTML = html;
      }

    } catch(err) {
      statusEl.textContent = '⚠ ' + (err.message || 'Could not load meetings. Please try again.');
    }

    btn.disabled = false;
    btn.textContent = '📍 Search again';

  }, function(err) {
    var msg = err.code === 1
      ? 'Location access denied — please allow location in your browser settings and try again.'
      : 'Could not get your location. Please try again.';
    statusEl.textContent = msg;
    btn.disabled = false;
    btn.textContent = '📍 Find meetings near me';
  }, { timeout: 10000, maximumAge: 60000 });
}
// ─────────────────────────────────────────────────────────────────

