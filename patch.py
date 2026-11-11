import re
p='script.js'
s=open(p,encoding='utf-8').read()
def rep(old,new,count=1):
    global s
    assert s.count(old)>=1, old[:70]
    s=s.replace(old,new,count)

# ---------- 1. tech collects money: require ref for InstaPay / Vodafone ----------
rep("""                ${['Cash', 'InstaPay', 'Vodafone Cash'].map(m => `<option value="${m}" ${(task.paymentMethod || 'Cash') === m ? 'selected' : ''}>${m === 'Cash' ? L('Cash', 'نقدي') : m}</option>`).join('')}
            </select>
        </div>""","""                ${['Cash', 'InstaPay', 'Vodafone Cash'].map(m => `<option value="${m}" ${(task.paymentMethod || 'Cash') === m ? 'selected' : ''}>${m === 'Cash' ? L('Cash', 'نقدي') : m}</option>`).join('')}
            </select>
            <label class="block text-[10px] font-extrabold uppercase text-emerald-700 dark:text-emerald-400 pt-1.5">${L('InstaPay / Vodafone: payment number or reference *', 'انستا باي / فودافون: رقم العملية أو المرجع *')}</label>
            <input type="text" id="payref-${task.id}" value="${escapeHtml(task.paymentRef || '')}" maxlength="40" dir="ltr"
                placeholder="${L('Required if not cash', 'مطلوب إذا لم يكن نقداً')}"
                class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500">
        </div>""")
rep("""            const paymentMethod = methodEl ? methodEl.value : (task.paymentMethod || 'Cash');
            updateTaskStatus(taskId, 'Done', amount, paymentMethod);""","""            const paymentMethod = methodEl ? methodEl.value : (task.paymentMethod || 'Cash');
            const refEl = document.getElementById(`payref-${taskId}`);
            const payRef = refEl ? refEl.value.trim() : '';
            if (amount > 0 && paymentMethod !== 'Cash' && !payRef) {
                showToast(L('Enter the InstaPay / Vodafone payment number or reference.', 'اكتب رقم أو مرجع عملية انستا باي / فودافون.'), 'error');
                if (refEl) refEl.focus();
                return;
            }
            window.__payRefFor = { id: taskId, ref: paymentMethod === 'Cash' ? '' : payRef };
            updateTaskStatus(taskId, 'Done', amount, paymentMethod);""")
rep("""            if (paymentMethod) task.paymentMethod = paymentMethod;
        } else {""","""            if (paymentMethod) task.paymentMethod = paymentMethod;
            if (window.__payRefFor && window.__payRefFor.id === taskId) { task.paymentRef = window.__payRefFor.ref; window.__payRefFor = null; }
        } else {""")

# ---------- 2. buy order: store reference ----------
rep("""        gateway: gateway,
        paymentStatus: (!isRepair && Number(amount) > 0) ? 'pending' : 'none',""","""        gateway: gateway,
        transactionRef: isRepair ? '' : ((document.getElementById('orderCheckoutTxRef') || {}).value || '').trim(),
        paymentStatus: (!isRepair && Number(amount) > 0) ? 'pending' : 'none',""")

# ---------- 3. payments page: richer items + details screen ----------
rep("""        customer: custName(o.username), sub: '@' + (o.username || ''), what: (o.insuranceMonth ? insLabel(o.insuranceMonth) : '') + (o.insuranceUnitRef ? ' · ' + o.insuranceUnitRef : ''),
        method: o.gateway || '', ref: o.transactionRef || '', amount: Number(o.amount) || 0, date: o.date || '', doneAt: o.approvedAt || o.rejectedAt || ''
    }));""","""        customer: custName(o.username), sub: '@' + (o.username || ''), what: (o.insuranceMonth ? insLabel(o.insuranceMonth) : '') + (o.insuranceUnitRef ? ' · ' + o.insuranceUnitRef : ''),
        method: o.gateway || '', ref: o.transactionRef || '', amount: Number(o.amount) || 0, date: o.date || '', doneAt: o.approvedAt || o.rejectedAt || '',
        orderId: o.id, phone: payPhoneOf(o.username), location: o.location || '', title: o.itemTitle || ''
    }));""")
rep("""        method: o.gateway || '', ref: '', amount: Number(o.amount) || 0, date: o.date || '', doneAt: o.paymentDecidedAt || ''
    }));""","""        method: String(o.gateway || '').replace(/\\s*\\(Ref:.*\\)\\s*$/i, ''), ref: o.transactionRef || ((String(o.gateway || '').match(/\\(Ref:\\s*(.+?)\\)\\s*$/i) || [])[1] || ''), amount: Number(o.amount) || 0, date: o.date || '', doneAt: o.paymentDecidedAt || '',
        orderId: o.id, phone: payPhoneOf(o.username), location: o.location || '', title: o.itemTitle || ''
    }));""")
rep("""method: t.paymentMethod === 'Cash' || !t.paymentMethod ? L('Cash', 'نقدي') : t.paymentMethod, ref: '', amount: Number(t.amountReceived) || 0,
            date: t.completedDate || '', doneAt: t.paymentDecidedAt || ''
        };""","""method: t.paymentMethod === 'Cash' || !t.paymentMethod ? L('Cash', 'نقدي') : t.paymentMethod, ref: t.paymentRef || '', amount: Number(t.amountReceived) || 0,
            date: t.completedDate || '', doneAt: t.paymentDecidedAt || '',
            orderId: t.orderId || '', phone: payPhoneOf(o && o.username), location: (o && o.location) || '', title: t.title || ''
        };""")
rep("""function getPaymentItems() {""","""function payPhoneOf(username) {
    const c = state.users.find(x => String(x.username || '').toLowerCase() === String(username || '').toLowerCase());
    return c ? (c.contactPhone || c.whatsapp || c.phone || '') : '';
}

// Full-screen details of one payment: number / reference, method, amount, customer, with Approve / Reject.
function openPaymentDetails(kind, id) {
    const i = [].concat(...Object.values(getPaymentItems())).find(x => x.kind === kind && String(x.id) === String(id));
    if (!i) return;
    closePaymentDetails();
    const row = (k, v, mono) => `<div class="flex items-start justify-between gap-4 py-2.5 border-b border-slate-100 dark:border-slate-800"><span class="text-sm font-extrabold uppercase text-slate-500 dark:text-slate-300">${k}</span><span class="text-lg font-extrabold text-end break-all ${mono ? 'font-mono' : ''}" dir="auto">${escapeHtml(String(v || '—'))}</span></div>`;
    const stateBadge = i.state === 'approved' ? 'bg-emerald-100 text-emerald-700' : i.state === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';
    const stateTxt = i.state === 'approved' ? L('Approved', 'تمت الموافقة') : i.state === 'rejected' ? L('Rejected', 'مرفوض') : L('Pending', 'بانتظار الموافقة');
    const kindTxt = { insurance: L('Insurance', 'التأمين'), fix: L('Repair', 'الصيانة'), buy: L('Order', 'طلب شراء') }[i.kind];
    const d = document.createElement('div');
    d.id = 'paymentDetailsModal';
    d.className = 'fixed inset-0 z-[70] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4';
    d.onclick = e => { if (e.target === d) closePaymentDetails(); };
    d.innerHTML = `<div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between gap-3">
            <h3 class="text-xl font-extrabold"><i class="fa-solid fa-wallet text-sky-500 me-2"></i>${L('Payment details', 'تفاصيل الدفعة')}</h3>
            <button type="button" onclick="closePaymentDetails()" class="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 p-4 text-center">
            <span class="block text-sm font-extrabold uppercase text-sky-700 dark:text-sky-300">${escapeHtml(i.method || '—')} ${L('payment number / reference', 'رقم / مرجع الدفع')}</span>
            <span class="block text-3xl font-extrabold font-mono mt-1 break-all" dir="ltr">${escapeHtml(i.ref || '—')}</span>
            <span class="block text-2xl font-extrabold text-emerald-600 mt-2">${(Number(i.amount) || 0).toLocaleString()} EGP</span>
        </div>
        <div>
            ${row(L('Type', 'النوع'), kindTxt)}
            ${row(L('Status', 'الحالة'), '')}
            ${row(L('Customer', 'العميل'), i.customer)}
            ${row(L('Username', 'اسم المستخدم'), i.sub)}
            ${row(L('Phone', 'الهاتف'), i.phone, true)}
            ${row(L('Item / month', 'البند / الشهر'), i.what || i.title)}
            ${row(L('Order ref', 'رقم الطلب'), i.orderId, true)}
            ${row(L('Location', 'الموقع'), i.location)}
            ${row(L('Date', 'التاريخ'), i.date)}
        </div>
        <div class="text-center"><span class="inline-block px-4 py-1.5 rounded-full text-sm font-extrabold uppercase ${stateBadge}">${stateTxt}</span></div>
        ${i.state === 'pending' ? `<div class="grid grid-cols-2 gap-3">
            <button type="button" onclick="approvePayment('${i.kind}','${escapeHtml(String(i.id))}');closePaymentDetails()" class="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-base font-extrabold uppercase"><i class="fa-solid fa-check me-1"></i>${L('Approve', 'موافقة')}</button>
            <button type="button" onclick="rejectPayment('${i.kind}','${escapeHtml(String(i.id))}');closePaymentDetails()" class="py-3 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 text-base font-extrabold uppercase"><i class="fa-solid fa-xmark me-1"></i>${L('Reject', 'رفض')}</button>
        </div>` : ''}
    </div>`;
    document.body.appendChild(d);
}
function closePaymentDetails() { const d = document.getElementById('paymentDetailsModal'); if (d) d.remove(); }

function getPaymentItems() {""")
# row: clickable + view button
rep("""    const rowHtml = i => `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40">""","""    const rowHtml = i => `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer" onclick="openPaymentDetails('${i.kind}','${escapeHtml(String(i.id))}')">""")
rep("""            <td class="p-3">
                <div class="flex items-center gap-1.5">
                    <button type="button" onclick="approvePayment(""","""            <td class="p-3" onclick="event.stopPropagation()">
                <div class="flex items-center gap-1.5">
                    <button type="button" onclick="openPaymentDetails('${i.kind}','${escapeHtml(String(i.id))}')" class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-700 dark:bg-sky-950 dark:text-sky-300 text-xs font-extrabold uppercase tracking-wide transition"><i class="fa-solid fa-eye"></i>${L('View', 'عرض')}</button>
                    <button type="button" onclick="approvePayment(""")
rep("Object.assign(window, { renderPaymentsPage, setPaymentsFilter, approvePayment, rejectPayment, updatePaymentsBadge });","Object.assign(window, { renderPaymentsPage, setPaymentsFilter, approvePayment, rejectPayment, updatePaymentsBadge, openPaymentDetails, closePaymentDetails });")

# ---------- 4. customer dashboard: payment status line ----------
rep("""                    <td class="p-4">${getStatusBadge(o.status)}${renderCustomerStageLine(o)}</td>""","""                    <td class="p-4">${getStatusBadge(o.status)}${renderCustomerPaymentLine(o)}${renderCustomerStageLine(o)}</td>""")
rep("""// Small line under the status telling the customer which step of the repair they're at.""","""// Payment state shown to the customer: Pending until the admin approves it, then Approved (or Rejected).
function renderCustomerPaymentLine(o) {
    let st = '', method = '';
    if (o.type === 'Insurance') {
        st = o.status === 'Approved' ? 'approved' : o.status === 'Rejected' ? 'rejected' : 'pending'; method = o.gateway;
    } else if (o.type === 'Tech Fix Service') {
        const t = getLinkedTaskForOrder(o.id);
        if (!t || !(Number(t.amountReceived) > 0) || !t.paymentStatus || t.paymentStatus === 'none') return '';
        st = t.paymentStatus; method = t.paymentMethod;
    } else {
        if (!o.paymentStatus || o.paymentStatus === 'none') return '';
        st = o.paymentStatus; method = String(o.gateway || '').replace(/\\s*\\(Ref:.*\\)\\s*$/i, '');
    }
    const map = {
        pending: ['bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400', 'fa-hourglass-half', L('Payment pending', 'الدفع بانتظار الموافقة')],
        approved: ['bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400', 'fa-circle-check', L('Payment approved', 'تمت الموافقة على الدفع')],
        rejected: ['bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400', 'fa-circle-xmark', L('Payment rejected', 'تم رفض الدفع')]
    };
    const m = map[st] || map.pending;
    return `<span class="mt-1.5 inline-flex items-center gap-1.5 text-xs font-extrabold px-2.5 py-1 rounded-full ${m[0]}"><i class="fa-solid ${m[1]}"></i>${m[2]}${method ? ' · ' + escapeHtml(String(method)) : ''}</span>`;
}

// Small line under the status telling the customer which step of the repair they're at.""")

# ---------- 5. bot: prepared answers with choices ----------
rep("""    function showBotMainMenu() {
        botStep = 'menu';
        showBotCredentialForm(false); // hide credential form if still showing
        botShowMenu([
            { icon: 'fa-box', label: L('Orders — browse AC units', 'الطلبات — تصفح أجهزة التكييف'), action: 'botTopic("orders")' },
            { icon: 'fa-screwdriver-wrench', label: L('Repairs — book a technical fix', 'الصيانة — حجز خدمة فنية'), action: 'botTopic("repairs")' },
            { icon: 'fa-headset', label: L('Talk to Customer Service', 'التحدث إلى خدمة العملاء'), action: 'botTopic("cs")' }
        ]);
    }""","""    function showBotMainMenu() {
        botStep = 'menu';
        showBotCredentialForm(false); // hide credential form if still showing
        botShowMenu([
            { icon: 'fa-box', label: L('Orders — browse AC units', 'الطلبات — تصفح أجهزة التكييف'), action: 'botTopic("orders")' },
            { icon: 'fa-screwdriver-wrench', label: L('Repairs — book a technical fix', 'الصيانة — حجز خدمة فنية'), action: 'botTopic("repairs")' },
            { icon: 'fa-shield-heart', label: L('Insurance — plan & payment', 'التأمين — الخطة والدفع'), action: 'botFaq("ins")' },
            { icon: 'fa-wallet', label: L('Payment — InstaPay / Vodafone', 'الدفع — انستا باي / فودافون'), action: 'botFaq("pay")' },
            { icon: 'fa-location-dot', label: L('Track my orders & payments', 'تتبع طلباتي ومدفوعاتي'), action: 'botFaq("track")' },
            { icon: 'fa-map', label: L('Service areas & contact', 'مناطق الخدمة والتواصل'), action: 'botFaq("areas")' },
            { icon: 'fa-headset', label: L('Talk to Customer Service', 'التحدث إلى خدمة العملاء'), action: 'botTopic("cs")' }
        ]);
    }

    // Prepared answers: every answer ends with follow-up choices.
    function botFaq(key) {
        botHideMenu();
        const egp = t('egp_symbol', 'EGP');
        const back = { icon: 'fa-list', label: L('Main menu', 'القائمة الرئيسية'), action: 'showBotMainMenu()' };
        const cs = { icon: 'fa-headset', label: L('Talk to Customer Service', 'التحدث إلى خدمة العملاء'), action: 'botTopic("cs")' };
        const say = (en, ar) => botAddMessage('bot', L(en, ar));
        const c = (icon, en, ar, action) => ({ icon, label: L(en, ar), action });
        const insNum = 'coolingart@instapay', vfNum = '010 9876 5432';
        const T = {
            ins: () => { say('🛡️ Cooling Art Protection Insurance — what would you like to know?', '🛡️ تأمين كولينج آرت — عن ماذا تريد أن تسأل؟');
                botShowMenu([c('fa-circle-check', 'What is covered?', 'ماذا يغطي؟', 'botFaq("ins_cover")'), c('fa-coins', 'Price & how to pay', 'السعر وطريقة الدفع', 'botFaq("ins_pay")'), c('fa-shield-heart', 'Pay my insurance now', 'ادفع تأميني الآن', 'botOpenInsurance()'), back]); },
            ins_cover: () => { say('Covered: breakdowns, electrical failures and Freon leaks for your registered AC unit, as long as the monthly payment is approved.', 'يشمل: الأعطال والمشاكل الكهربائية وتسريب الفريون للوحدة المسجلة، طالما تمت الموافقة على الدفعة الشهرية.');
                botShowMenu([c('fa-coins', 'Price & how to pay', 'السعر وطريقة الدفع', 'botFaq("ins_pay")'), c('fa-shield-heart', 'Pay my insurance now', 'ادفع تأميني الآن', 'botOpenInsurance()'), back]); },
            ins_pay: () => { say(`Insurance costs <strong>100 ${egp} / month</strong>. Pay by InstaPay (<strong>${insNum}</strong>) or Vodafone Cash (<strong>${vfNum}</strong>), then enter the transaction reference. It shows as <strong>Pending</strong> in your dashboard until the admin approves it.`, `التأمين <strong>100 جنيه / شهر</strong>. ادفع عبر انستا باي (<strong>${insNum}</strong>) أو فودافون كاش (<strong>${vfNum}</strong>) ثم اكتب رقم العملية. تظهر <strong>بانتظار الموافقة</strong> في لوحتك حتى يوافق المسؤول.`);
                botShowMenu([c('fa-shield-heart', 'Pay my insurance now', 'ادفع تأميني الآن', 'botOpenInsurance()'), c('fa-clock', 'How long is approval?', 'كم تستغرق الموافقة؟', 'botFaq("pay_time")'), back]); },
            pay: () => { say('💳 Which payment method do you need help with?', '💳 أي طريقة دفع تريد المساعدة بها؟');
                botShowMenu([c('fa-building-columns', 'InstaPay steps', 'خطوات انستا باي', 'botFaq("pay_insta")'), c('fa-mobile-screen', 'Vodafone Cash steps', 'خطوات فودافون كاش', 'botFaq("pay_voda")'), c('fa-clock', 'How long is approval?', 'كم تستغرق الموافقة؟', 'botFaq("pay_time")'), c('fa-money-bill-wave', 'Pay the technician (repair)', 'الدفع للفني (الصيانة)', 'botFaq("pay_tech")'), back]); },
            pay_insta: () => { say(`1) Transfer the amount to <strong>${insNum}</strong>.<br>2) Copy the transaction reference.<br>3) Paste it in the order / insurance form and submit.<br>Status stays <strong>Pending</strong> until approved.`, `1) حوّل المبلغ إلى <strong>${insNum}</strong>.<br>2) انسخ رقم العملية.<br>3) ألصقه في نموذج الطلب / التأمين وأرسل.<br>تبقى الحالة <strong>بانتظار الموافقة</strong> حتى تتم الموافقة.`);
                botShowMenu([c('fa-location-dot', 'Track my payments', 'تتبع مدفوعاتي', 'botFaq("track")'), c('fa-wallet', 'Other payment help', 'مساعدة أخرى في الدفع', 'botFaq("pay")'), back]); },
            pay_voda: () => { say(`1) Send the amount to <strong>${vfNum}</strong>.<br>2) Enter your 11-digit sender phone number in the form.<br>3) Submit — status is <strong>Pending</strong> until approved.`, `1) أرسل المبلغ إلى <strong>${vfNum}</strong>.<br>2) اكتب رقم هاتفك المرسل (11 رقماً) في النموذج.<br>3) أرسل — الحالة <strong>بانتظار الموافقة</strong> حتى تتم الموافقة.`);
                botShowMenu([c('fa-location-dot', 'Track my payments', 'تتبع مدفوعاتي', 'botFaq("track")'), c('fa-wallet', 'Other payment help', 'مساعدة أخرى في الدفع', 'botFaq("pay")'), back]); },
            pay_time: () => { say('Every InstaPay / Vodafone payment is checked by the admin team. Once approved, your dashboard changes from <strong>Pending</strong> to <strong>Approved</strong>. Need it faster? Talk to Customer Service.', 'يراجع فريق الإدارة كل دفعة انستا باي / فودافون. بعد الموافقة تتغير حالتها في لوحتك من <strong>بانتظار الموافقة</strong> إلى <strong>تمت الموافقة</strong>. تحتاج أسرع؟ تحدث مع خدمة العملاء.');
                botShowMenu([c('fa-location-dot', 'Track my payments', 'تتبع مدفوعاتي', 'botFaq("track")'), cs, back]); },
            pay_tech: () => { say('For repairs you pay the technician after the job: Cash, InstaPay or Vodafone Cash. For InstaPay / Vodafone the technician records the payment number, and it appears in your dashboard as <strong>Pending</strong> until approved.', 'في الصيانة تدفع للفني بعد إنجاز العمل: نقداً أو انستا باي أو فودافون كاش. عند انستا باي / فودافون يسجل الفني رقم العملية وتظهر في لوحتك <strong>بانتظار الموافقة</strong> حتى تتم الموافقة.');
                botShowMenu([c('fa-screwdriver-wrench', 'Book a repair', 'احجز صيانة', 'botNavigate("tech-fix")'), back]); },
            track: () => {
                if (!state.currentUser) { say('Please log in first to see your orders and payments.', 'يرجى تسجيل الدخول أولاً لعرض طلباتك ومدفوعاتك.'); botShowMenu([back, cs]); return; }
                const mine = (state.orders || []).filter(o => String(o.username || '').toLowerCase() === state.currentUser.username.toLowerCase()).slice(0, 5);
                if (!mine.length) { say('You have no orders yet.', 'ليس لديك طلبات بعد.'); botShowMenu([c('fa-box', 'Browse AC units', 'تصفح الأجهزة', 'botNavigate("products")'), c('fa-screwdriver-wrench', 'Book a repair', 'احجز صيانة', 'botNavigate("tech-fix")'), back]); return; }
                const payTxt = o => { let st = ''; if (o.type === 'Insurance') st = o.status === 'Approved' ? 'approved' : o.status === 'Rejected' ? 'rejected' : 'pending'; else if (o.type === 'Tech Fix Service') { const k = getLinkedTaskForOrder(o.id); st = k && Number(k.amountReceived) > 0 ? k.paymentStatus : ''; } else st = o.paymentStatus; if (!st || st === 'none') return ''; return ' · ' + ({ pending: L('Payment pending', 'الدفع بانتظار الموافقة'), approved: L('Payment approved', 'تمت الموافقة على الدفع'), rejected: L('Payment rejected', 'تم رفض الدفع') }[st] || ''); };
                botAddMessage('bot', `${L('Your latest orders:', 'آخر طلباتك:')}<br>` + mine.map(o => `• <strong>${escapeHtml(o.id)}</strong> — ${escapeHtml(o.itemTitle || '')}<br>&nbsp;&nbsp;${escapeHtml(o.status || '—')}${payTxt(o)}`).join('<br>'));
                botShowMenu([c('fa-id-card', 'Open my dashboard', 'افتح لوحتي', 'botNavigate("customer-dashboard")'), back, cs]); },
            areas: () => { const names = (state.areas || []).map(a => escapeHtml(state.currentLang === 'ar' && a.nameAr ? a.nameAr : a.name)).join('، ');
                const ct = (typeof loadContactInfo === 'function') ? loadContactInfo() : { email: '', phone: '', whatsapp: '' };
                botAddMessage('bot', `${names ? '📍 ' + L('We serve:', 'نخدم:') + ' ' + names + '<br><br>' : ''}📞 <strong>${escapeHtml(ct.phone)}</strong><br>💬 WhatsApp: <strong>${escapeHtml(ct.whatsapp)}</strong><br>✉️ ${escapeHtml(ct.email)}`);
                botShowMenu([c('fa-address-book', 'Open Contact page', 'افتح صفحة التواصل', 'botNavigate("contact")'), cs, back]); },
            rep_book: () => { say('Booking a repair: 1) open Repairs, 2) pick the service, 3) choose your area and the unit to check, 4) confirm. A technician is dispatched, and you pay after the job.', 'حجز صيانة: 1) افتح الصيانة، 2) اختر الخدمة، 3) اختر منطقتك والوحدة المطلوب فحصها، 4) أكّد. يتم إرسال فني وتدفع بعد إنجاز العمل.');
                botShowMenu([c('fa-screwdriver-wrench', 'Open Repairs page', 'افتح صفحة الصيانة', 'botNavigate("tech-fix")'), c('fa-wallet', 'Payment help', 'مساعدة الدفع', 'botFaq("pay")'), back]); },
            rep_prices: () => { const items = state.services.slice(0, 5).map(x => `• ${escapeHtml(x.name)} — <strong>${Number(x.price).toLocaleString()} ${egp}</strong>`).join('<br>');
                botAddMessage('bot', `${L('Repair prices:', 'أسعار الصيانة:')}<br>${items}`);
                botShowMenu([c('fa-screwdriver-wrench', 'Book a repair', 'احجز صيانة', 'botNavigate("tech-fix")'), back]); },
            ord_how: () => { say('Buying a unit: 1) open Products, 2) tap Order, 3) pay by InstaPay or Vodafone Cash and paste the reference, 4) choose location. Your order shows <strong>Pending</strong> payment until approved.', 'شراء وحدة: 1) افتح المنتجات، 2) اضغط طلب، 3) ادفع بانستا باي أو فودافون كاش والصق رقم العملية، 4) اختر موقعك. يظهر طلبك بدفع <strong>بانتظار الموافقة</strong> حتى تتم الموافقة.');
                botShowMenu([c('fa-box', 'Open Products page', 'افتح صفحة المنتجات', 'botNavigate("products")'), c('fa-wallet', 'Payment help', 'مساعدة الدفع', 'botFaq("pay")'), back]); }
        };
        (T[key] || T.pay)();
    }
    window.botFaq = botFaq;""")

# repairs/orders topics: add choices
rep("""            botShowMenu([
                { icon: 'fa-arrow-right', label: L('Open Products page', 'فتح صفحة المنتجات'), action: 'botNavigate("products")' },
                { icon: 'fa-headset', label: L('Talk to Customer Service', 'التحدث إلى خدمة العملاء'), action: 'botTopic("cs")' }
            ]);
        } else if (topic === 'repairs') {""","""            botShowMenu([
                { icon: 'fa-arrow-right', label: L('Open Products page', 'فتح صفحة المنتجات'), action: 'botNavigate("products")' },
                { icon: 'fa-circle-question', label: L('How do I order & pay?', 'كيف أطلب وأدفع؟'), action: 'botFaq("ord_how")' },
                { icon: 'fa-list', label: L('Main menu', 'القائمة الرئيسية'), action: 'showBotMainMenu()' },
                { icon: 'fa-headset', label: L('Talk to Customer Service', 'التحدث إلى خدمة العملاء'), action: 'botTopic("cs")' }
            ]);
        } else if (topic === 'repairs') {""")
rep("""            botShowMenu([
                { icon: 'fa-arrow-right', label: L('Open Repairs page', 'فتح صفحة الصيانة'), action: 'botNavigate("tech-fix")' },
                { icon: 'fa-headset', label: L('Talk to Customer Service', 'التحدث إلى خدمة العملاء'), action: 'botTopic("cs")' }
            ]);""","""            botShowMenu([
                { icon: 'fa-arrow-right', label: L('Open Repairs page', 'فتح صفحة الصيانة'), action: 'botNavigate("tech-fix")' },
                { icon: 'fa-circle-question', label: L('How does booking work?', 'كيف يتم الحجز؟'), action: 'botFaq("rep_book")' },
                { icon: 'fa-tags', label: L('Repair prices', 'أسعار الصيانة'), action: 'botFaq("rep_prices")' },
                { icon: 'fa-wallet', label: L('How do I pay?', 'كيف أدفع؟'), action: 'botFaq("pay_tech")' },
                { icon: 'fa-list', label: L('Main menu', 'القائمة الرئيسية'), action: 'showBotMainMenu()' }
            ]);""")
# keyword intent for payment / track
rep("""        if (w(/insur|warrant|تأمين|تامين|ضمان/)) {""","""        if (w(/instapay|insta pay|vodafone|فودافون|انستا|إنستا|pay|دفع|ادفع/) && !w(/insur|تأمين|تامين/)) { botFaq('pay'); return; }
        if (w(/track|status|my order|طلباتي|حالة|تتبع/)) { botFaq('track'); return; }
        if (w(/insur|warrant|تأمين|تامين|ضمان/)) {""")
open(p,'w',encoding='utf-8').write(s)

# ---------- CSS ----------
css=open('style.css',encoding='utf-8').read()
css+="""

/* ===== Bigger + bolder data (dashboards, logs, payments, details) ===== */
:is(#view-admin-dashboard,#view-customer-dashboard,#view-customer-log,#view-tech-home,#view-tech-dashboard,#view-payments,#view-insurance,#view-arabi,#view-chats,#orderDetailsModal,#paymentDetailsModal) {
    font-weight: 600;
}
:is(#view-admin-dashboard,#view-customer-dashboard,#view-customer-log,#view-tech-home,#view-tech-dashboard,#view-payments,#view-insurance,#view-arabi,#view-chats,#orderDetailsModal) :is(.text-xs,.text-\\[11px\\],.text-\\[10px\\],.text-\\[9px\\],td,th,label,p,span,li,input,select,textarea,button):not(.fa-solid):not(.fa-regular):not(i) {
    font-weight: 700;
}
:is(#view-admin-dashboard,#view-customer-dashboard,#view-customer-log,#view-tech-home,#view-tech-dashboard,#view-payments,#view-insurance,#view-arabi,#view-chats,#orderDetailsModal) .text-\\[9px\\] { font-size: .8125rem !important; }
:is(#view-admin-dashboard,#view-customer-dashboard,#view-customer-log,#view-tech-home,#view-tech-dashboard,#view-payments,#view-insurance,#view-arabi,#view-chats,#orderDetailsModal) .text-\\[10px\\] { font-size: .875rem !important; }
:is(#view-admin-dashboard,#view-customer-dashboard,#view-customer-log,#view-tech-home,#view-tech-dashboard,#view-payments,#view-insurance,#view-arabi,#view-chats,#orderDetailsModal) .text-\\[11px\\] { font-size: .9375rem !important; }
:is(#view-admin-dashboard,#view-customer-dashboard,#view-customer-log,#view-tech-home,#view-tech-dashboard,#view-payments,#view-insurance,#view-arabi,#view-chats,#orderDetailsModal) .text-xs { font-size: 1rem !important; line-height: 1.5rem; }
:is(#view-admin-dashboard,#view-customer-dashboard,#view-customer-log,#view-tech-home,#view-tech-dashboard,#view-payments,#view-insurance,#view-arabi,#view-chats,#orderDetailsModal) .text-sm { font-size: 1.125rem !important; line-height: 1.6rem; }
:is(#view-admin-dashboard,#view-customer-dashboard,#view-customer-log,#view-tech-home,#view-tech-dashboard,#view-payments,#view-insurance,#view-arabi,#view-chats,#orderDetailsModal) .text-base { font-size: 1.25rem !important; }
:is(#view-admin-dashboard,#view-customer-dashboard,#view-customer-log,#view-tech-home,#view-tech-dashboard,#view-payments,#view-insurance,#view-arabi,#view-chats) .text-xl { font-size: 1.6rem !important; }
:is(#view-admin-dashboard,#view-customer-dashboard,#view-customer-log,#view-tech-home,#view-tech-dashboard,#view-payments,#view-insurance,#view-arabi,#view-chats) .text-2xl { font-size: 2rem !important; }
:is(#view-admin-dashboard,#view-customer-dashboard,#view-customer-log,#view-tech-home,#view-tech-dashboard,#view-payments,#view-insurance,#view-arabi,#view-chats) .text-3xl { font-size: 2.4rem !important; }
:is(#view-customer-dashboard,#view-admin-dashboard,#view-customer-log,#view-payments) :is(td,th) { padding: 1rem !important; }
:is(#view-customer-dashboard,#view-admin-dashboard,#view-customer-log,#view-payments) td { color: inherit; }
#view-customer-dashboard.max-w-3xl { max-width: 64rem; }

/* bot: larger, bolder choices */
#chatBotMenu .bot-chip { font-size: .95rem; font-weight: 800; }
#chatBotMessages { font-size: .95rem; font-weight: 600; }
"""
open('style.css','w',encoding='utf-8').write(css)
