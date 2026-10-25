// Text for the English / Hindi / Odia switch (see context/LanguageContext.jsx).
//
// Keys are grouped by screen. English is the source: a key missing from `hi` or `or` (Odia) falls back to English,
// so a page is never blank. Brand names, place names and data from the server stay as they are.
// Use {name} in a text for a value filled in at runtime.
//
// Covered: navigation, footer, the home search, My Trips (with the cancel and change-date windows),
// the payment page, the review area and the assistant window. Other pages are still English.

export const LANGUAGES = [
  { code: "en", label: "EN", name: "English" },
  { code: "hi", label: "हिं", name: "हिन्दी" },
  { code: "or", label: "ଓଡ଼ିଆ", name: "ଓଡ଼ିଆ" },
];

export const en = {
  // navigation
  "nav.home": "Home",
  "nav.destinations": "Destinations",
  "nav.stays": "Stays",
  "nav.trips": "Trips",
  "nav.favorites": "Favorites",
  "nav.about": "About",
  "nav.contact": "Contact",
  "nav.register": "Register",
  "nav.login": "Login",
  "nav.travelerLogin": "Traveler Login",
  "nav.logout": "Logout",
  "nav.admin": "Admin",
  "nav.adminPortal": "Admin Portal",
  "nav.welcome": "Welcome, {name}",
  "nav.traveler": "Traveler",
  "nav.tagline": "Smart Travel India",
  "nav.menu": "Toggle Navigation Menu",
  "lang.switch": "Switch language",

  // footer
  "footer.about": "Smart Indian Travel Planning & Booking Portal. Discover 36 States and Union Territories, curated tourist heritage, and authentic stays with intelligent trip planning.",
  "footer.built": "Built with the MERN stack",
  "footer.navigation": "Navigation",
  "footer.explore": "Explore 36 States & UTs",
  "footer.accommodations": "Accommodations & Stays",
  "footer.bookings": "My Bookings",
  "footer.favorites": "My Favorites",
  "footer.aboutUs": "About us",
  "footer.contactUs": "Contact us",
  "footer.regions": "Indian Regions",
  "footer.north": "North India",
  "footer.south": "South India",
  "footer.west": "West India",
  "footer.east": "East India",
  "footer.northeast": "Northeast India",
  "footer.ut": "Union Territories",
  "footer.account": "Your Account",
  "footer.createAccount": "Create an account",
  "footer.manage": "Manage bookings",
  "footer.plan": "Plan a trip",
  "footer.rights": "VOYARA Smart Travel Portal. All rights reserved.",
  "footer.demo": "Payments are in demo mode. No real charges are made.",

  // home
  "home.badge": "Smart Travel Portal for Incredible India",
  "home.title1": "Plan Your Journey Across",
  "home.title2": "All 36 Indian States & UTs",
  "home.subtitle": "Seamlessly explore curated heritage attractions, select verified accommodations, and design complete smart itineraries with transparent booking logic.",
  "home.tabStays": "Stays",
  "home.tabDestinations": "Destinations",
  "home.tabTrips": "My Trips",
  "home.tabFavorites": "Favorites",
  "home.where": "Where do you want to go?",
  "home.wherePlaceholder": "Search city, e.g. Puri, Jaipur, Mumbai",
  "home.checkIn": "Check-In",
  "home.checkOut": "Check-Out",
  "home.guests": "Guests & Rooms",
  "home.search": "Search",

  // my trips
  "trips.change": "Change dates",
  "trips.cancel": "Cancel Booking",
  "trips.view": "View Details",
  "trips.cancelTitle": "Cancel this booking?",
  "trips.cancelChecking": "Checking the cancellation policy...",
  "trips.keep": "Keep booking",
  "trips.cancelYes": "Yes, cancel booking",
  "trips.cancelling": "Cancelling...",
  "trips.changeTitle": "Change your dates",
  "trips.checkIn": "Check-in",
  "trips.checkOut": "Check-out",
  "trips.paidNote": "This booking is paid, so you can move it to other days with the same total (the same number of nights).",
  "trips.keepDates": "Keep my dates",
  "trips.checkPrice": "Check price and availability",
  "trips.checking": "Checking...",
  "trips.confirmDates": "Confirm new dates",
  "trips.saving": "Saving...",
  "trips.available": "Available!",
  "trips.newTotal": "new total",

  // payment
  "pay.title": "Complete Your Payment",
  "pay.subtitleDemo": "Complete the demo payment to confirm your VOYARA booking.",
  "pay.subtitleLive": "Pay securely to confirm your VOYARA booking.",
  "pay.secure": "Secure Checkout",
  "pay.secureDemo": "Demo Secure Checkout",
  "pay.online": "Pay online",
  "pay.onlineHint": "Cards, UPI, net banking and wallets through Razorpay.",
  "pay.private": "Your payment details stay private",
  "pay.privateBody": "You enter them in the Razorpay secure window. VOYARA never sees or stores your card or UPI details.",
  "pay.pay": "Pay ₹{amount}",
  "pay.demoButton": "Complete Demo Payment",
  "pay.processing": "Processing...",
  "pay.bySummary": "Booking Summary",
  "pay.total": "Total Amount",
  "pay.taxes": "Taxes",
  "pay.roomCost": "Room Cost",
  "pay.processedBy": "🔒 Payments are processed by Razorpay.",
  "pay.demoNote": "🔒 Demo transaction only. No real payment will be processed.",

  // reviews
  "reviews.label": "TRAVELER REVIEWS",
  "reviews.title": "What travelers say",
  "reviews.rate": "Rate your experience",
  "reviews.update": "Update your review",
  "reviews.post": "Post review",
  "reviews.updateBtn": "Update review",
  "reviews.saving": "Saving...",
  "reviews.placeholder": "Share what you liked (optional)",
  "reviews.newest": "Newest",
  "reviews.helpful": "Most helpful",
  "reviews.helpfulBtn": "Helpful",
  "reviews.addPhotos": "Add photos",
  "reviews.empty": "No reviews yet. Be the first to share your experience!",
  "reviews.loading": "Loading reviews...",

  // assistant
  "assistant.open": "Ask VOYARA",
  "assistant.title": "VOYARA Assistant",
  "assistant.subtitle": "Trips, prices and bookings",
  "assistant.placeholder": "Ask about a trip...",
  "assistant.welcome": "Hi! I am your VOYARA travel assistant. Ask me for trip ideas, a cost estimate, booking help or your bookings.",
  "assistant.close": "Close assistant",
  "assistant.send": "Send",
  "assistant.error": "I could not reach the server. Please try again.",
};

export const hi = {
  // navigation
  "nav.home": "होम",
  "nav.destinations": "गंतव्य",
  "nav.stays": "ठहरने की जगहें",
  "nav.trips": "यात्राएँ",
  "nav.favorites": "पसंदीदा",
  "nav.about": "हमारे बारे में",
  "nav.contact": "संपर्क",
  "nav.register": "रजिस्टर करें",
  "nav.login": "लॉगिन",
  "nav.travelerLogin": "यात्री लॉगिन",
  "nav.logout": "लॉगआउट",
  "nav.admin": "एडमिन",
  "nav.adminPortal": "एडमिन पोर्टल",
  "nav.welcome": "स्वागत है, {name}",
  "nav.traveler": "यात्री",
  "nav.tagline": "स्मार्ट ट्रैवल इंडिया",
  "nav.menu": "नेविगेशन मेन्यू खोलें या बंद करें",
  "lang.switch": "भाषा बदलें",

  // footer
  "footer.about": "भारत के लिए स्मार्ट यात्रा योजना और बुकिंग पोर्टल। 36 राज्यों और केंद्रशासित प्रदेशों की खोज करें, चुनिंदा पर्यटन स्थल देखें और समझदार ट्रिप प्लानिंग के साथ भरोसेमंद ठहरने की जगहें पाएँ।",
  "footer.built": "MERN स्टैक से बना",
  "footer.navigation": "नेविगेशन",
  "footer.explore": "36 राज्य और केंद्रशासित प्रदेश देखें",
  "footer.accommodations": "ठहरने की जगहें और होटल",
  "footer.bookings": "मेरी बुकिंग",
  "footer.favorites": "मेरे पसंदीदा",
  "footer.aboutUs": "हमारे बारे में",
  "footer.contactUs": "हमसे संपर्क करें",
  "footer.regions": "भारत के क्षेत्र",
  "footer.north": "उत्तर भारत",
  "footer.south": "दक्षिण भारत",
  "footer.west": "पश्चिम भारत",
  "footer.east": "पूर्व भारत",
  "footer.northeast": "पूर्वोत्तर भारत",
  "footer.ut": "केंद्रशासित प्रदेश",
  "footer.account": "आपका खाता",
  "footer.createAccount": "खाता बनाएँ",
  "footer.manage": "बुकिंग संभालें",
  "footer.plan": "यात्रा की योजना बनाएँ",
  "footer.rights": "VOYARA स्मार्ट ट्रैवल पोर्टल। सर्वाधिकार सुरक्षित।",
  "footer.demo": "भुगतान अभी डेमो मोड में है। कोई असली पैसा नहीं कटता।",

  // home
  "home.badge": "अतुल्य भारत के लिए स्मार्ट ट्रैवल पोर्टल",
  "home.title1": "अपनी यात्रा की योजना बनाइए",
  "home.title2": "भारत के सभी 36 राज्यों और केंद्रशासित प्रदेशों में",
  "home.subtitle": "चुनिंदा विरासत स्थलों को आसानी से देखिए, भरोसेमंद ठहरने की जगहें चुनिए और साफ़-सुथरी बुकिंग के साथ पूरी यात्रा की योजना बनाइए।",
  "home.tabStays": "ठहरना",
  "home.tabDestinations": "गंतव्य",
  "home.tabTrips": "मेरी यात्राएँ",
  "home.tabFavorites": "पसंदीदा",
  "home.where": "आप कहाँ जाना चाहते हैं?",
  "home.wherePlaceholder": "शहर खोजें, जैसे पुरी, जयपुर, मुंबई",
  "home.checkIn": "चेक-इन",
  "home.checkOut": "चेक-आउट",
  "home.guests": "मेहमान और कमरे",
  "home.search": "खोजें",

  // my trips
  "trips.change": "तारीख़ बदलें",
  "trips.cancel": "बुकिंग रद्द करें",
  "trips.view": "विवरण देखें",
  "trips.cancelTitle": "यह बुकिंग रद्द करें?",
  "trips.cancelChecking": "रद्दीकरण नीति जाँची जा रही है...",
  "trips.keep": "बुकिंग रखें",
  "trips.cancelYes": "हाँ, बुकिंग रद्द करें",
  "trips.cancelling": "रद्द हो रही है...",
  "trips.changeTitle": "अपनी तारीख़ें बदलें",
  "trips.checkIn": "चेक-इन",
  "trips.checkOut": "चेक-आउट",
  "trips.paidNote": "यह बुकिंग भुगतान हो चुकी है, इसलिए आप इसे उतने ही कुल दाम वाली दूसरी तारीख़ों पर (उतनी ही रातों के लिए) ले जा सकते हैं।",
  "trips.keepDates": "मेरी तारीख़ें रखें",
  "trips.checkPrice": "दाम और उपलब्धता जाँचें",
  "trips.checking": "जाँच हो रही है...",
  "trips.confirmDates": "नई तारीख़ें पक्की करें",
  "trips.saving": "सेव हो रहा है...",
  "trips.available": "उपलब्ध है!",
  "trips.newTotal": "नया कुल",

  // payment
  "pay.title": "अपना भुगतान पूरा करें",
  "pay.subtitleDemo": "अपनी VOYARA बुकिंग पक्की करने के लिए डेमो भुगतान पूरा करें।",
  "pay.subtitleLive": "अपनी VOYARA बुकिंग पक्की करने के लिए सुरक्षित भुगतान करें।",
  "pay.secure": "सुरक्षित चेकआउट",
  "pay.secureDemo": "डेमो सुरक्षित चेकआउट",
  "pay.online": "ऑनलाइन भुगतान करें",
  "pay.onlineHint": "Razorpay के ज़रिए कार्ड, UPI, नेट बैंकिंग और वॉलेट।",
  "pay.private": "आपकी भुगतान जानकारी निजी रहती है",
  "pay.privateBody": "आप इसे Razorpay की सुरक्षित विंडो में भरते हैं। VOYARA आपका कार्ड या UPI विवरण न देखता है, न सहेजता है।",
  "pay.pay": "₹{amount} का भुगतान करें",
  "pay.demoButton": "डेमो भुगतान पूरा करें",
  "pay.processing": "प्रोसेस हो रहा है...",
  "pay.bySummary": "बुकिंग सारांश",
  "pay.total": "कुल राशि",
  "pay.taxes": "कर",
  "pay.roomCost": "कमरे का खर्च",
  "pay.processedBy": "🔒 भुगतान Razorpay द्वारा प्रोसेस होता है।",
  "pay.demoNote": "🔒 केवल डेमो लेन-देन। कोई असली भुगतान नहीं होगा।",

  // reviews
  "reviews.label": "यात्रियों की समीक्षाएँ",
  "reviews.title": "यात्री क्या कहते हैं",
  "reviews.rate": "अपना अनुभव रेट करें",
  "reviews.update": "अपनी समीक्षा अपडेट करें",
  "reviews.post": "समीक्षा पोस्ट करें",
  "reviews.updateBtn": "समीक्षा अपडेट करें",
  "reviews.saving": "सेव हो रहा है...",
  "reviews.placeholder": "बताइए आपको क्या पसंद आया (वैकल्पिक)",
  "reviews.newest": "सबसे नई",
  "reviews.helpful": "सबसे उपयोगी",
  "reviews.helpfulBtn": "उपयोगी",
  "reviews.addPhotos": "फ़ोटो जोड़ें",
  "reviews.empty": "अभी कोई समीक्षा नहीं है। अपना अनुभव सबसे पहले साझा करें!",
  "reviews.loading": "समीक्षाएँ लोड हो रही हैं...",

  // assistant
  "assistant.open": "VOYARA से पूछें",
  "assistant.title": "VOYARA सहायक",
  "assistant.subtitle": "यात्राएँ, दाम और बुकिंग",
  "assistant.placeholder": "यात्रा के बारे में पूछें...",
  "assistant.welcome": "नमस्ते! मैं आपका VOYARA यात्रा सहायक हूँ। मुझसे यात्रा के आइडिया, खर्च का अंदाज़ा, बुकिंग में मदद या अपनी बुकिंग के बारे में पूछिए।",
  "assistant.close": "सहायक बंद करें",
  "assistant.send": "भेजें",
  "assistant.error": "सर्वर तक नहीं पहुँच पाया। कृपया फिर कोशिश करें।",
};

const orCore = {
  // navigation
  "nav.home": "ହୋମ",
  "nav.destinations": "ଗନ୍ତବ୍ୟସ୍ଥଳ",
  "nav.stays": "ରହଣି",
  "nav.trips": "ଯାତ୍ରା",
  "nav.favorites": "ପସନ୍ଦର",
  "nav.about": "ଆମ ବିଷୟରେ",
  "nav.contact": "ଯୋଗାଯୋଗ",
  "nav.register": "ପଞ୍ଜୀକରଣ",
  "nav.login": "ଲଗଇନ୍",
  "nav.travelerLogin": "ଯାତ୍ରୀ ଲଗଇନ୍",
  "nav.logout": "ଲଗଆଉଟ୍",
  "nav.admin": "ଆଡମିନ୍",
  "nav.adminPortal": "ଆଡମିନ୍ ପୋର୍ଟାଲ୍",
  "nav.welcome": "ସ୍ୱାଗତ, {name}",
  "nav.traveler": "ଯାତ୍ରୀ",
  "nav.tagline": "ସ୍ମାର୍ଟ ଟ୍ରାଭେଲ୍ ଇଣ୍ଡିଆ",
  "nav.menu": "ନେଭିଗେସନ୍ ମେନୁ ଖୋଲନ୍ତୁ କିମ୍ବା ବନ୍ଦ କରନ୍ତୁ",
  "lang.switch": "ଭାଷା ବଦଳାନ୍ତୁ",

  // footer
  "footer.about": "ଭାରତ ପାଇଁ ସ୍ମାର୍ଟ ଯାତ୍ରା ଯୋଜନା ଏବଂ ବୁକିଂ ପୋର୍ଟାଲ୍। ୩୬ଟି ରାଜ୍ୟ ଓ କେନ୍ଦ୍ରଶାସିତ ଅଞ୍ଚଳ ଦେଖନ୍ତୁ, ବାଛିଥିବା ପର୍ଯ୍ୟଟନ ସ୍ଥଳ ଦେଖନ୍ତୁ ଏବଂ ବୁଦ୍ଧିମାନ ଯାତ୍ରା ଯୋଜନା ସହିତ ଭରସାଯୋଗ୍ୟ ରହିବା ସ୍ଥାନ ପାଆନ୍ତୁ।",
  "footer.built": "MERN ଷ୍ଟାକ୍ ରେ ତିଆରି",
  "footer.navigation": "ନେଭିଗେସନ୍",
  "footer.explore": "୩୬ଟି ରାଜ୍ୟ ଓ କେନ୍ଦ୍ରଶାସିତ ଅଞ୍ଚଳ ଦେଖନ୍ତୁ",
  "footer.accommodations": "ରହିବା ସ୍ଥାନ ଓ ହୋଟେଲ୍",
  "footer.bookings": "ମୋର ବୁକିଂ",
  "footer.favorites": "ମୋର ପସନ୍ଦ",
  "footer.aboutUs": "ଆମ ବିଷୟରେ",
  "footer.contactUs": "ଆମ ସହ ଯୋଗାଯୋଗ କରନ୍ତୁ",
  "footer.regions": "ଭାରତର ଅଞ୍ଚଳ",
  "footer.north": "ଉତ୍ତର ଭାରତ",
  "footer.south": "ଦକ୍ଷିଣ ଭାରତ",
  "footer.west": "ପଶ୍ଚିମ ଭାରତ",
  "footer.east": "ପୂର୍ବ ଭାରତ",
  "footer.northeast": "ଉତ୍ତର-ପୂର୍ବ ଭାରତ",
  "footer.ut": "କେନ୍ଦ୍ରଶାସିତ ଅଞ୍ଚଳ",
  "footer.account": "ଆପଣଙ୍କ ଖାତା",
  "footer.createAccount": "ଖାତା ତିଆରି କରନ୍ତୁ",
  "footer.manage": "ବୁକିଂ ପରିଚାଳନା କରନ୍ତୁ",
  "footer.plan": "ଯାତ୍ରା ଯୋଜନା କରନ୍ତୁ",
  "footer.rights": "VOYARA ସ୍ମାର୍ଟ ଟ୍ରାଭେଲ୍ ପୋର୍ଟାଲ୍। ସର୍ବସ୍ୱତ୍ୱ ସଂରକ୍ଷିତ।",
  "footer.demo": "ପେମେଣ୍ଟ ବର୍ତ୍ତମାନ ଡେମୋ ମୋଡ୍ ରେ ଅଛି। କୌଣସି ପ୍ରକୃତ ଟଙ୍କା କଟାଯାଏ ନାହିଁ।",

  // home
  "home.badge": "ଅତୁଳନୀୟ ଭାରତ ପାଇଁ ସ୍ମାର୍ଟ ଟ୍ରାଭେଲ୍ ପୋର୍ଟାଲ୍",
  "home.title1": "ଆପଣଙ୍କ ଯାତ୍ରା ଯୋଜନା କରନ୍ତୁ",
  "home.title2": "ଭାରତର ସମସ୍ତ ୩୬ଟି ରାଜ୍ୟ ଓ କେନ୍ଦ୍ରଶାସିତ ଅଞ୍ଚଳରେ",
  "home.subtitle": "ବାଛିଥିବା ଐତିହ୍ୟ ସ୍ଥଳ ସହଜରେ ଦେଖନ୍ତୁ, ଭରସାଯୋଗ୍ୟ ରହିବା ସ୍ଥାନ ବାଛନ୍ତୁ ଏବଂ ସ୍ପଷ୍ଟ ବୁକିଂ ସହିତ ସମ୍ପୂର୍ଣ୍ଣ ଯାତ୍ରା ଯୋଜନା କରନ୍ତୁ।",
  "home.tabStays": "ରହଣି",
  "home.tabDestinations": "ଗନ୍ତବ୍ୟସ୍ଥଳ",
  "home.tabTrips": "ମୋ ଯାତ୍ରା",
  "home.tabFavorites": "ପସନ୍ଦର",
  "home.where": "ଆପଣ କେଉଁଠାକୁ ଯିବାକୁ ଚାହାଁନ୍ତି?",
  "home.wherePlaceholder": "ସହର ଖୋଜନ୍ତୁ, ଯେପରି ପୁରୀ, ଜୟପୁର, ମୁମ୍ବାଇ",
  "home.checkIn": "ଚେକ୍-ଇନ୍",
  "home.checkOut": "ଚେକ୍-ଆଉଟ୍",
  "home.guests": "ଅତିଥି ଓ କୋଠରୀ",
  "home.search": "ଖୋଜନ୍ତୁ",

  // my trips
  "trips.change": "ତାରିଖ ବଦଳାନ୍ତୁ",
  "trips.cancel": "ବୁକିଂ ବାତିଲ୍ କରନ୍ତୁ",
  "trips.view": "ବିବରଣୀ ଦେଖନ୍ତୁ",
  "trips.cancelTitle": "ଏହି ବୁକିଂ ବାତିଲ୍ କରିବେ?",
  "trips.cancelChecking": "ବାତିଲ୍ ନୀତି ଯାଞ୍ଚ ହେଉଛି...",
  "trips.keep": "ବୁକିଂ ରଖନ୍ତୁ",
  "trips.cancelYes": "ହଁ, ବୁକିଂ ବାତିଲ୍ କରନ୍ତୁ",
  "trips.cancelling": "ବାତିଲ୍ ହେଉଛି...",
  "trips.changeTitle": "ଆପଣଙ୍କ ତାରିଖ ବଦଳାନ୍ତୁ",
  "trips.checkIn": "ଚେକ୍-ଇନ୍",
  "trips.checkOut": "ଚେକ୍-ଆଉଟ୍",
  "trips.paidNote": "ଏହି ବୁକିଂର ପେମେଣ୍ଟ ହୋଇସାରିଛି, ତେଣୁ ଆପଣ ଏହାକୁ ସମାନ ମୋଟ ମୂଲ୍ୟର (ସମାନ ରାତି ସଂଖ୍ୟା) ଅନ୍ୟ ତାରିଖକୁ ନେଇପାରିବେ।",
  "trips.keepDates": "ମୋ ତାରିଖ ରଖନ୍ତୁ",
  "trips.checkPrice": "ମୂଲ୍ୟ ଓ ଉପଲବ୍ଧତା ଯାଞ୍ଚ କରନ୍ତୁ",
  "trips.checking": "ଯାଞ୍ଚ ହେଉଛି...",
  "trips.confirmDates": "ନୂଆ ତାରିଖ ନିଶ୍ଚିତ କରନ୍ତୁ",
  "trips.saving": "ସେଭ୍ ହେଉଛି...",
  "trips.available": "ଉପଲବ୍ଧ ଅଛି!",
  "trips.newTotal": "ନୂଆ ମୋଟ",

  // payment
  "pay.title": "ଆପଣଙ୍କ ପେମେଣ୍ଟ ସମ୍ପୂର୍ଣ୍ଣ କରନ୍ତୁ",
  "pay.subtitleDemo": "ଆପଣଙ୍କ VOYARA ବୁକିଂ ନିଶ୍ଚିତ କରିବାକୁ ଡେମୋ ପେମେଣ୍ଟ ସମ୍ପୂର୍ଣ୍ଣ କରନ୍ତୁ।",
  "pay.subtitleLive": "ଆପଣଙ୍କ VOYARA ବୁକିଂ ନିଶ୍ଚିତ କରିବାକୁ ସୁରକ୍ଷିତ ଭାବେ ପେମେଣ୍ଟ କରନ୍ତୁ।",
  "pay.secure": "ସୁରକ୍ଷିତ ଚେକ୍ଆଉଟ୍",
  "pay.secureDemo": "ଡେମୋ ସୁରକ୍ଷିତ ଚେକ୍ଆଉଟ୍",
  "pay.online": "ଅନଲାଇନ୍ ପେମେଣ୍ଟ କରନ୍ତୁ",
  "pay.onlineHint": "Razorpay ମାଧ୍ୟମରେ କାର୍ଡ, UPI, ନେଟ୍ ବ୍ୟାଙ୍କିଂ ଓ ୱାଲେଟ୍।",
  "pay.private": "ଆପଣଙ୍କ ପେମେଣ୍ଟ ବିବରଣୀ ଗୋପନ ରହେ",
  "pay.privateBody": "ଆପଣ ଏହାକୁ Razorpay ର ସୁରକ୍ଷିତ ୱିଣ୍ଡୋରେ ଦିଅନ୍ତି। VOYARA ଆପଣଙ୍କ କାର୍ଡ କିମ୍ବା UPI ବିବରଣୀ କେବେ ଦେଖେ ନାହିଁ କିମ୍ବା ସାଇତେ ନାହିଁ।",
  "pay.pay": "₹{amount} ପେମେଣ୍ଟ କରନ୍ତୁ",
  "pay.demoButton": "ଡେମୋ ପେମେଣ୍ଟ ସମ୍ପୂର୍ଣ୍ଣ କରନ୍ତୁ",
  "pay.processing": "ପ୍ରକ୍ରିୟା ଚାଲିଛି...",
  "pay.bySummary": "ବୁକିଂ ସାରାଂଶ",
  "pay.total": "ମୋଟ ରାଶି",
  "pay.taxes": "କର",
  "pay.roomCost": "କୋଠରୀ ଖର୍ଚ୍ଚ",
  "pay.processedBy": "🔒 ପେମେଣ୍ଟ Razorpay ଦ୍ୱାରା ପ୍ରକ୍ରିୟାକରଣ ହୁଏ।",
  "pay.demoNote": "🔒 କେବଳ ଡେମୋ ଲେନଦେନ। କୌଣସି ପ୍ରକୃତ ପେମେଣ୍ଟ ହେବ ନାହିଁ।",

  // reviews
  "reviews.label": "ଯାତ୍ରୀଙ୍କ ସମୀକ୍ଷା",
  "reviews.title": "ଯାତ୍ରୀମାନେ କ'ଣ କହନ୍ତି",
  "reviews.rate": "ଆପଣଙ୍କ ଅଭିଜ୍ଞତାକୁ ରେଟ୍ କରନ୍ତୁ",
  "reviews.update": "ଆପଣଙ୍କ ସମୀକ୍ଷା ଅପଡେଟ୍ କରନ୍ତୁ",
  "reviews.post": "ସମୀକ୍ଷା ପୋଷ୍ଟ କରନ୍ତୁ",
  "reviews.updateBtn": "ସମୀକ୍ଷା ଅପଡେଟ୍ କରନ୍ତୁ",
  "reviews.saving": "ସେଭ୍ ହେଉଛି...",
  "reviews.placeholder": "ଆପଣଙ୍କୁ କ'ଣ ଭଲ ଲାଗିଲା କୁହନ୍ତୁ (ବିକଳ୍ପ)",
  "reviews.newest": "ନୂଆ",
  "reviews.helpful": "ସବୁଠାରୁ ଉପଯୋଗୀ",
  "reviews.helpfulBtn": "ଉପଯୋଗୀ",
  "reviews.addPhotos": "ଫଟୋ ଯୋଡ଼ନ୍ତୁ",
  "reviews.empty": "ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ସମୀକ୍ଷା ନାହିଁ। ଆପଣଙ୍କ ଅଭିଜ୍ଞତା ପ୍ରଥମେ ଅଂଶୀଦାର କରନ୍ତୁ!",
  "reviews.loading": "ସମୀକ୍ଷା ଲୋଡ୍ ହେଉଛି...",

  // assistant
  "assistant.open": "VOYARA କୁ ପଚାରନ୍ତୁ",
  "assistant.title": "VOYARA ସହାୟକ",
  "assistant.subtitle": "ଯାତ୍ରା, ମୂଲ୍ୟ ଓ ବୁକିଂ",
  "assistant.placeholder": "ଯାତ୍ରା ବିଷୟରେ ପଚାରନ୍ତୁ...",
  "assistant.welcome": "ନମସ୍କାର! ମୁଁ ଆପଣଙ୍କ VOYARA ଯାତ୍ରା ସହାୟକ। ମୋତେ ଯାତ୍ରା ଧାରଣା, ଖର୍ଚ୍ଚର ଅନୁମାନ, ବୁକିଂ ସାହାଯ୍ୟ କିମ୍ବା ଆପଣଙ୍କ ବୁକିଂ ବିଷୟରେ ପଚାରନ୍ତୁ।",
  "assistant.close": "ସହାୟକ ବନ୍ଦ କରନ୍ତୁ",
  "assistant.send": "ପଠାନ୍ତୁ",
  "assistant.error": "ସର୍ଭର୍ ସହ ଯୋଗାଯୋଗ ହୋଇପାରିଲା ନାହିଁ। ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।",
};

// Odia starts with the small structured keys above. Its many "English text": "Odia text" entries
// (screens, server messages, curated places) live in or-phrases.js and are added by
// ensureLanguage() in runtime.js the first time Odia is chosen.
export const or = orCore;

export const translations = { en, hi, or };

// Texts that hold {placeholders} also match sentences with real values filled in, for example a
// server message "Only 2 room(s) available." matches "Only {n} room(s) available." (built once per language)
const templateCache = {};

/** Call after adding texts to a language, so sentence templates are rebuilt. */
export const resetTemplates = (lang) => {
  delete templateCache[lang];
};

const templatesFor = (lang) => {
  if (!templateCache[lang]) {
    templateCache[lang] = Object.keys(translations[lang] || {})
      .filter((key) => /\{\w+\}/.test(key) && !/^[a-z]+\.[a-zA-Z.]+$/.test(key))
      .map((key) => {
        const names = [];
        const source = key
          .replace(/[.*+?^$()|[\]\\]/g, "\\$&")
          .replace(/\{(\w+)\}/g, (match, name) => {
            names.push(name);
            return "(.+?)";
          });

        return { key, names, regex: new RegExp(`^${source}$`) };
      });
  }

  return templateCache[lang];
};

const fill = (text, vars) => text.replace(/\{(\w+)\}/g, (match, name) => (vars[name] === undefined ? match : String(vars[name])));

/** Looks up a text. Falls back to English, then to the key itself, so nothing is ever blank. */
export const translate = (lang, key, vars) => {
  // data can be a number, a React element or missing: show it as it is
  if (typeof key !== "string") return key;

  const found = translations[lang]?.[key];

  if (found !== undefined) return vars ? fill(found, vars) : found;

  // a sentence with values already filled in (server messages): match it against the templates
  if (!vars && lang !== "en") {
    for (const { key: templateKey, names, regex } of templatesFor(lang)) {
      const match = key.match(regex);

      if (match) return fill(translations[lang][templateKey], Object.fromEntries(names.map((name, i) => [name, match[i + 1]])));
    }
  }

  const text = translations.en[key] ?? key;

  return vars ? fill(text, vars) : text;
};
