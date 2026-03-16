  // Scroll reveal
    const revealEls = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => observer.observe(el));

    // Nav scroll effect
    const nav = document.querySelector('nav');
    window.addEventListener('scroll', () => {
      nav.style.borderBottomColor = window.scrollY > 40
        ? 'rgba(255,255,255,0.1)'
        : 'rgba(255,255,255,0.06)';
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const target = document.querySelector(a.getAttribute('href'));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

  if (history.scrollRestoration) {
    history.scrollRestoration = 'manual';
  }
  window.onbeforeunload = function() {
    window.scrollTo(0, 0);
  };

  var selectedPlan = 'onetime';
  var selectedBins = 1;

  var zipDays = {
    '11413':'Monday','11411':'Monday','11422':'Monday','11436':'Monday',
    '11432':'Tuesday','11433':'Tuesday','11434':'Tuesday','11435':'Tuesday','11412':'Tuesday','11423':'Tuesday','11427':'Tuesday','11428':'Tuesday','11429':'Tuesday',
    '11414':'Wednesday','11415':'Wednesday','11416':'Wednesday','11417':'Wednesday','11418':'Wednesday','11419':'Wednesday','11420':'Wednesday','11421':'Wednesday',
    '11373':'Thursday','11374':'Thursday','11375':'Thursday','11366':'Thursday','11367':'Thursday','11368':'Thursday','11369':'Thursday','11385':'Thursday','11378':'Thursday','11379':'Thursday',
    '11354':'Friday','11355':'Friday','11356':'Friday','11357':'Friday','11358':'Friday','11359':'Friday','11360':'Friday','11361':'Friday','11362':'Friday','11363':'Friday','11364':'Friday','11365':'Friday',
    '11101':'Saturday','11102':'Saturday','11103':'Saturday','11104':'Saturday','11105':'Saturday','11106':'Saturday','11370':'Saturday','11372':'Saturday','11377':'Saturday','11691':'Saturday','11692':'Saturday','11693':'Saturday','11694':'Saturday','11697':'Saturday'
  };

  function openBookingModal() {
    document.getElementById('booking-modal').style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  function closeBookingModal() {
    document.getElementById('booking-modal').style.display = 'none';
    document.body.style.overflow = '';
  }

  function updatePrice() {
    var extra = selectedBins > 4 ? (selectedBins - 4) * 10 : 0;
    var total = 30 + extra;
    document.getElementById('price-total').textContent = '$' + total.toFixed(2);
    var breakdown = 'One-time: $30 (up to 4 bins)';
    if (selectedBins > 4) breakdown += ' + $' + extra + ' (' + (selectedBins - 4) + ' extra bin' + (selectedBins > 5 ? 's' : '') + ')';
    document.getElementById('price-breakdown').textContent = breakdown;
  }

  function selectPlan(plan) {
    selectedPlan = plan;
    updatePrice();
  }

  function selectBins(n) {
    selectedBins = n;
    document.getElementById('bins-custom').style.display = 'none';
    [1,2,3,4].forEach(function(i) {
      var el = document.getElementById('bins-' + i);
      if (i === n) {
        el.style.border = '1px solid rgba(0,200,150,0.6)';
        el.style.background = 'rgba(0,200,150,0.1)';
        el.style.color = '#00C896';
      } else {
        el.style.border = '1px solid rgba(255,255,255,0.12)';
        el.style.background = 'rgba(255,255,255,0.04)';
        el.style.color = 'rgba(255,255,255,0.7)';
      }
    });
    updatePrice();
  }

  function selectBinsPlus() {
    selectedBins = 4;
    [1,2,3,4].forEach(function(i) {
      var el = document.getElementById('bins-' + i);
      el.style.border = i === 4 ? '1px solid rgba(0,200,150,0.6)' : '1px solid rgba(255,255,255,0.12)';
      el.style.background = i === 4 ? 'rgba(0,200,150,0.1)' : 'rgba(255,255,255,0.04)';
      el.style.color = i === 4 ? '#00C896' : 'rgba(255,255,255,0.7)';
    });
    document.getElementById('bins-custom').style.display = 'block';
    document.getElementById('bins-custom-input').value = 4;
    updatePrice();
  }

  function adjustCustomBins(delta) {
    var input = document.getElementById('bins-custom-input');
    var val = Math.max(4, Math.min(20, parseInt(input.value) + delta));
    input.value = val;
    selectedBins = val;
    updatePrice();
  }

  function setCustomBins(val) {
    val = Math.max(4, Math.min(20, parseInt(val) || 4));
    selectedBins = val;
    updatePrice();
  }

  function resetBinsToButtons() {
    document.getElementById('bins-custom').style.display = 'none';
    selectBins(1);
  }

  function updateServiceDay() {
    var zip = document.getElementById('f-zip').value;
    var dayEl = document.getElementById('service-day-display');
    if (zipDays[zip]) {
      dayEl.style.display = 'block';
      dayEl.textContent = '📅 Your service day: ' + zipDays[zip];
      dayEl.style.color = '#00C896';
    } else {
      dayEl.style.display = 'none';
    }
    var modalDayEl = document.getElementById('modal-service-day');
    if (modalDayEl) {
      var day = zipDays[zip];
      if (day) {
        modalDayEl.textContent = selectedPlan === 'onetime' ? day : day + 's';
      } else {
        modalDayEl.textContent = 'Enter ZIP to see';
      }
    }
  }

  // Populate next 4 months in the dropdown
  (function() {
    var select = document.getElementById('f-date');
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var now = new Date();
    for (var i = 0; i < 4; i++) {
      var d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      var val = d.getFullYear() + '-' + (d.getMonth()+1);
      var label = months[d.getMonth()] + ' ' + d.getFullYear();
      var opt = document.createElement('option');
      opt.value = val;
      opt.textContent = label;
      select.appendChild(opt);
    }
  })();

  function getLastWeekDates(year, month) {
    var lastDay = new Date(year, month, 0);
    var lastMonday = new Date(lastDay);
    lastMonday.setDate(lastDay.getDate() - ((lastDay.getDay() + 6) % 7));
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var start = lastMonday.getDate() + ' ' + months[lastMonday.getMonth()];
    var end = new Date(lastMonday);
    end.setDate(end.getDate() + 5);
    var endStr = end.getDate() + ' ' + months[end.getMonth()];
    return start + ' – ' + endStr;
  }

  function updateScheduleNote() {
    var val = document.getElementById('f-date').value;
    var noteEl = document.getElementById('schedule-note');
    if (!val) { noteEl.style.display = 'none'; return; }
    var parts = val.split('-');
    var year = parseInt(parts[0]);
    var month = parseInt(parts[1]);
    var dates = getLastWeekDates(year, month);
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    noteEl.style.display = 'block';
    noteEl.innerHTML = '📅 <strong style="color:#00C896;">Your clean week: ' + dates + '</strong><br>We clean the last week of every month. We\'ll text you 3 days before with your exact day and time window.';
  }

  async function submitBooking() {
  var name = document.getElementById('f-name').value.trim();
  var phone = document.getElementById('f-phone').value.trim();
  var email = document.getElementById('f-email').value.trim();
  var address = document.getElementById('f-address').value.trim();
  var zip = document.getElementById('f-zip').value.trim();
  var date = document.getElementById('f-date').value;

  if (!name || !phone || !email || !address || !zip || !date) {
    alert('Please fill in all required fields.');
    return;
  }

  var btn = document.querySelector('#booking-modal button[onclick="submitBooking()"]');
  if (phone.length !== 10) {
    alert('Please enter a valid 10-digit phone number.');
    btn.textContent = 'Confirm Booking →';
    btn.style.opacity = '1';
    btn.disabled = false;
    return;
  }

  var waterAccess = document.getElementById('f-water-access').value;

  var binTypes = [];
  document.querySelectorAll('#booking-modal input[type="checkbox"]:checked').forEach(function(cb) {
    binTypes.push(cb.value);
  });

  var monthSelect = document.getElementById('f-date');
  var monthLabel = monthSelect.options[monthSelect.selectedIndex].text;

  var cleanWeekEl = document.getElementById('schedule-note');
  var cleanWeek = cleanWeekEl ? cleanWeekEl.textContent.replace('📅', '').trim() : '';

  var extra = selectedBins > 4 ? (selectedBins - 4) * 10 : 0;
  var estimatedPrice = 30 + extra;

  var serviceDay = zipDays[zip] || 'TBC';

  var source = document.getElementById('f-source').value;
  var notes = document.getElementById('f-notes').value.trim();

  if (waterAccess === 'no') {
    alert('Sorry, we currently require an outdoor water connection to service your bins. We\'re working on expanding to all property types soon!');
    btn.textContent = 'Confirm Booking →';
    btn.style.opacity = '1';
    btn.disabled = false;
    return;
  }
  btn.textContent = 'Submitting...';
  btn.style.opacity = '0.6';
  btn.disabled = true;

  var checkPhone = await fetch('https://fuyvrepazocbkufywexu.supabase.co/rest/v1/bookings?phone=eq.' + encodeURIComponent(phone) + '&select=id', {
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1eXZyZXBhem9jYmt1Znl3ZXh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MzgzNzMsImV4cCI6MjA4ODUxNDM3M30.70d9VKNHI1xGVVJjKF4BvRpQa1fFq6a1cH3IRzC2FRE',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1eXZyZXBhem9jYmt1Znl3ZXh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MzgzNzMsImV4cCI6MjA4ODUxNDM3M30.70d9VKNHI1xGVVJjKF4BvRpQa1fFq6a1cH3IRzC2FRE'
    }
  });
  var phoneData = await checkPhone.json();
  if (phoneData.length > 0) {
    alert('A booking already exists for this phone number. Call us at (347) 953-8998 to manage your booking.');
    btn.textContent = 'Confirm Booking →';
    btn.style.opacity = '1';
    btn.disabled = false;
    return;
  }

  var checkAddress = await fetch('https://fuyvrepazocbkufywexu.supabase.co/rest/v1/bookings?address=ilike.' + encodeURIComponent(address) + '&select=id', {
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1eXZyZXBhem9jYmt1Znl3ZXh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MzgzNzMsImV4cCI6MjA4ODUxNDM3M30.70d9VKNHI1xGVVJjKF4BvRpQa1fFq6a1cH3IRzC2FRE',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1eXZyZXBhem9jYmt1Znl3ZXh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MzgzNzMsImV4cCI6MjA4ODUxNDM3M30.70d9VKNHI1xGVVJjKF4BvRpQa1fFq6a1cH3IRzC2FRE'
    }
  });
  var addressData = await checkAddress.json();
  if (addressData.length > 0) {
    alert('A booking already exists for this address. Call us at (347) 953-8998 to manage your booking.');
    btn.textContent = 'Confirm Booking →';
    btn.style.opacity = '1';
    btn.disabled = false;
    return;
  }

  try {
    var response = await fetch('https://fuyvrepazocbkufywexu.supabase.co/rest/v1/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1eXZyZXBhem9jYmt1Znl3ZXh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MzgzNzMsImV4cCI6MjA4ODUxNDM3M30.70d9VKNHI1xGVVJjKF4BvRpQa1fFq6a1cH3IRzC2FRE',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1eXZyZXBhem9jYmt1Znl3ZXh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MzgzNzMsImV4cCI6MjA4ODUxNDM3M30.70d9VKNHI1xGVVJjKF4BvRpQa1fFq6a1cH3IRzC2FRE',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        name: name,
        phone: phone,
        email: email,
        address: address,
        zip: zip,
        service_day: serviceDay,
        plan: selectedPlan,
        bins: selectedBins,
        bin_types: binTypes,
        start_month: monthLabel,
        clean_week: cleanWeek,
        source: source,
        notes: notes,
        water_access: waterAccess,
        status: 'pending',
        estimated_price: estimatedPrice
      })
    });

    if (response.ok) {
      var modalInner = document.querySelector('#booking-modal > div:last-child > div');
      modalInner.innerHTML =
        '<div style="text-align:center; padding:30px 20px;">' +
        '<div style="font-size:48px; margin-bottom:12px;">✅</div>' +
        '<h3 style="font-family:Bebas Neue,sans-serif; font-size:26px; color:#00C896; margin-bottom:6px;">BOOKING CONFIRMED!</h3>' +
        '<p style="color:rgba(255,255,255,0.5); font-size:13px; margin-bottom:24px;">Hi ' + name + '! Your slot is reserved. Now complete your payment to lock it in.</p>' +

        '<p style="font-size:12px; color:rgba(255,255,255,0.4); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:12px;">Choose payment method</p>' +

        '<div style="display:flex; gap:10px; margin-bottom:20px;">' +

        '<button onclick="showZelleDetails()" style="flex:1; padding:14px; background:#6C1CD1; border:none; border-radius:12px; color:#fff; font-weight:800; font-size:14px; cursor:pointer; font-family:DM Sans,sans-serif;">💜 Pay with Zelle</button>' +

        '<button onclick="showCardSoon()" style="flex:1; padding:14px; background:#1a1a1a; border:1px solid rgba(255,255,255,0.1); border-radius:12px; color:rgba(255,255,255,0.4); font-weight:800; font-size:14px; cursor:pointer; font-family:DM Sans,sans-serif;">💳 Pay by Card</button>' +

        '</div>' +

        '<div id="zelle-details" style="display:none; background:#1a1a2e; border:1px solid rgba(108,28,209,0.3); border-radius:14px; padding:20px; text-align:left; margin-bottom:16px;">' +
        '<p style="font-size:12px; color:rgba(255,255,255,0.4); margin-bottom:12px; text-align:center;">Send payment to FreshBin via Zelle</p>' +
        '<div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.06);">' +
        '<span style="font-size:12px; color:rgba(255,255,255,0.4);">Phone</span>' +
        '<a href="tel:+13479538998" style="font-size:15px; font-weight:800; color:#6C1CD1; text-decoration:none;">+1 (347) 953-8998</a>' +
        '</div>' +
        '<div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.06);">' +
        '<span style="font-size:12px; color:rgba(255,255,255,0.4);">Reference</span>' +
        '<span style="font-size:13px; font-weight:700; color:#fff;">' + name + ' — FreshBin</span>' +
        '</div>' +
        '<div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0;">' +
        '<span style="font-size:12px; color:rgba(255,255,255,0.4);">Amount</span>' +
        '<span style="font-size:16px; font-weight:800; color:#00C896;">$' + estimatedPrice + '.00</span>' +
        '</div>' +
        '<a href="tel:+13479538998" style="display:block; margin-top:14px; padding:12px; background:#6C1CD1; border-radius:10px; color:#fff; font-weight:800; font-size:13px; text-align:center; text-decoration:none;">📱 Open Zelle / Banking App</a>' +
        '<p style="font-size:11px; color:rgba(255,255,255,0.3); text-align:center; margin-top:8px;">Tap your bank app → Zelle → Send → enter our number</p>' +
        '</div>' +

        '<div id="card-soon" style="display:none; background:#1a1a1a; border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:16px; margin-bottom:16px;">' +
        '<p style="font-size:13px; color:rgba(255,255,255,0.5); text-align:center;">💳 Card payments coming soon! For now please use Zelle to complete your booking.</p>' +
        '</div>' +

        '<button onclick="closeBookingModal()" style="width:100%; padding:12px; background:transparent; border:1px solid rgba(255,255,255,0.1); border-radius:10px; color:rgba(255,255,255,0.4); font-weight:700; font-size:13px; cursor:pointer; font-family:DM Sans,sans-serif;">Close</button>' +
        '</div>';
    } else {
      var err = await response.text();
      console.error('Supabase error:', err);
      btn.textContent = 'Confirm Booking →';
      btn.style.opacity = '1';
      btn.disabled = false;

      if (err.includes('unique_booking_address')) {
        alert('This address already has a booking with us. If you need help managing your booking please call (347) 953-8998.');
      } else if (err.includes('unique_booking_phone')) {
        alert('This phone number already has a booking with us. If you need help managing your booking please call (347) 953-8998.');
      } else {
        alert('Something went wrong. Please try again or call us at (347) 953-8998.');
      }
    }
  } catch (error) {
    console.error('Network error:', error);
    btn.textContent = 'Confirm Booking →';
    btn.style.opacity = '1';
    btn.disabled = false;
    alert('Something went wrong. Please try again or call us at (347) 953-8998.');
  }
}

function showZelleDetails() {
  document.getElementById('zelle-details').style.display = 'block';
  document.getElementById('card-soon').style.display = 'none';
}

function showCardSoon() {
  document.getElementById('card-soon').style.display = 'block';
  document.getElementById('zelle-details').style.display = 'none';
}

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeBookingModal();
  });
