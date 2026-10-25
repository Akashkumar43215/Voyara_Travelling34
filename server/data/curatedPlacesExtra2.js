/**
 * Second batch of curated landmarks: fills in the states and union territories
 * that had few or no places (Andaman, the North East, Lakshadweep and others).
 * See curatedBuilder.js for the row format.
 */

const { buildPlaces } = require("./curatedBuilder");

const AN = ["Andaman & Nicobar Islands", "andaman-and-nicobar-islands"];

const ROWS = [
  // ---------- Andaman & Nicobar Islands ----------
  ["Neil Island|Shaheed Dweep", "neil-island", "Neil Island (Shaheed Dweep)", "Neil Island", ...AN, 11.8334, 93.0467, "nature", "A quiet island of white beaches, coral reefs and the natural rock bridge, loved for snorkelling and slow island life."],
  ["Swaraj Dweep|Havelock Island", "havelock-island", "Havelock Island (Swaraj Dweep)", "Havelock", ...AN, 11.9722, 92.9842, "nature", "The most popular island of the Andamans, with turquoise water, scuba diving and some of Asia's best beaches."],
  ["Elephant Beach", "elephant-beach-havelock", "Elephant Beach", "Havelock", ...AN, 12.0187, 92.9889, "nature", "A forest-fringed beach reached by boat or a jungle trek, famous for snorkelling over shallow coral."],
  ["Ross Island (Andaman and Nicobar Islands)|Ross Island, Andaman and Nicobar Islands|Ross Island (Andaman)", "ross-island-andaman", "Ross Island", "Port Blair", ...AN, 11.6778, 92.7647, "heritage", "The former British capital of the Andamans, now a ruined town of old churches and bakeries reclaimed by banyan roots."],
  ["Baratang Island|Baratang", "baratang-limestone-caves", "Baratang Limestone Caves", "Baratang", ...AN, 12.1167, 92.7500, "nature", "Natural limestone caves with striking formations, reached by a mangrove boat ride from Baratang jetty."],
  ["Mahatma Gandhi Marine National Park", "wandoor-marine-national-park", "Mahatma Gandhi Marine National Park", "Wandoor", ...AN, 11.5800, 92.6200, "nature", "A protected marine park of coral reefs and islands near Port Blair, ideal for glass-bottom boat trips."],
  ["Chidiya Tapu", "chidiya-tapu", "Chidiya Tapu", "Port Blair", ...AN, 11.4975, 92.7110, "nature", "Known as the Bird Island, a quiet southern tip with mangroves, forest trails and spectacular sunsets."],
  ["Corbyn's Cove", "corbyns-cove-beach", "Corbyn's Cove Beach", "Port Blair", ...AN, 11.6430, 92.7550, "nature", "A coconut-fringed beach just outside Port Blair, good for a swim, water sports and an easy evening."],
  ["Mount Harriet National Park", "mount-harriet-national-park", "Mount Harriet National Park", "Port Blair", ...AN, 11.7600, 92.7200, "nature", "A forested hill with trails and panoramic views across the bay, once the summer capital of the British."],

  // ---------- Arunachal Pradesh ----------
  ["Tawang Monastery", "tawang-monastery", "Tawang Monastery", "Tawang", "Arunachal Pradesh", "arunachal-pradesh", 27.5859, 91.8594, "religious", "India's largest monastery, a 17th-century Buddhist complex high in the Himalayas above Tawang town."],
  ["Sela Pass", "sela-pass", "Sela Pass", "Tawang", "Arunachal Pradesh", "arunachal-pradesh", 27.5025, 92.0950, "nature", "A high mountain pass at around 4,100 m, with a frozen lake, snow and views of the eastern Himalayas."],
  ["Ziro", "ziro-valley", "Ziro Valley", "Ziro", "Arunachal Pradesh", "arunachal-pradesh", 27.5445, 93.8290, "nature", "A green plateau of rice fields and pine hills, home of the Apatani people and the Ziro Music Festival."],
  ["Namdapha National Park", "namdapha-national-park", "Namdapha National Park", "Miao", "Arunachal Pradesh", "arunachal-pradesh", 27.4900, 96.3800, "nature", "A vast rainforest reserve in the eastern Himalayas, home to four big cats and rich birdlife."],
  ["Ita Fort", "ita-fort-itanagar", "Ita Fort", "Itanagar", "Arunachal Pradesh", "arunachal-pradesh", 27.0844, 93.6053, "heritage", "A 14th-century brick fort that gave Itanagar its name, set among the hills of the capital."],
  ["Dirang", "dirang-valley", "Dirang Valley", "Dirang", "Arunachal Pradesh", "arunachal-pradesh", 27.3592, 92.2417, "nature", "A scenic valley of orchards, hot springs and a historic dzong, on the route to Tawang."],

  // ---------- Haryana ----------
  ["Brahma Sarovar", "brahma-sarovar-kurukshetra", "Brahma Sarovar", "Kurukshetra", "Haryana", "haryana", 29.9632, 76.8365, "religious", "A vast sacred tank at Kurukshetra, linked to the Mahabharata and the site of a famous solar eclipse fair."],
  ["Pinjore Gardens", "pinjore-gardens", "Pinjore Gardens", "Panchkula", "Haryana", "haryana", 30.7990, 76.9120, "heritage", "A terraced Mughal-style garden with fountains and a palace, set at the foot of the Shivalik hills."],
  ["Sultanpur National Park", "sultanpur-national-park", "Sultanpur National Park", "Gurugram", "Haryana", "haryana", 28.4650, 76.8830, "nature", "A bird sanctuary near Delhi that draws migratory birds from across the world every winter."],
  ["Surajkund", "surajkund", "Surajkund", "Faridabad", "Haryana", "haryana", 28.4965, 77.2827, "heritage", "A medieval reservoir shaped like a sun, famous for the annual Surajkund Crafts Mela."],
  ["Kingdom of Dreams", "kingdom-of-dreams", "Kingdom of Dreams", "Gurugram", "Haryana", "haryana", 28.4719, 77.0700, "cultural", "A live entertainment complex of Indian theatre, food and culture, one of Gurugram's top attractions."],
  ["Morni Hills", "morni-hills", "Morni Hills", "Panchkula", "Haryana", "haryana", 30.6900, 77.0900, "nature", "The only hill station of Haryana, with forest trails, lakes and cool air in the Shivaliks."],

  // ---------- Jharkhand ----------
  ["Hundru Falls", "hundru-falls", "Hundru Falls", "Ranchi", "Jharkhand", "jharkhand", 23.4533, 85.6750, "nature", "A 98 m waterfall on the Subarnarekha river, spectacular after the monsoon."],
  ["Betla National Park", "betla-national-park", "Betla National Park", "Latehar", "Jharkhand", "jharkhand", 23.8800, 84.1900, "nature", "A tiger reserve of sal forest, with elephants, bison and ancient ruined forts."],
  ["Netarhat", "netarhat", "Netarhat", "Latehar", "Jharkhand", "jharkhand", 23.4800, 84.2600, "nature", "The Queen of Chotanagpur, a hill station known for sunrise views and pine forests."],
  ["Baidyanath Temple, Deoghar|Baidyanath Temple", "baidyanath-temple-deoghar", "Baidyanath Temple", "Deoghar", "Jharkhand", "jharkhand", 24.4922, 86.7000, "religious", "One of the twelve Jyotirlingas and a major Shiva pilgrimage site, visited by lakhs during Shravani Mela."],
  ["Parasnath", "parasnath-hill", "Parasnath Hill", "Giridih", "Jharkhand", "jharkhand", 23.9600, 86.1300, "religious", "The highest peak in Jharkhand and the holiest site of Jainism, with a long pilgrim trek."],
  ["Jagannath Temple, Ranchi", "jagannath-temple-ranchi", "Jagannath Temple Ranchi", "Ranchi", "Jharkhand", "jharkhand", 23.3158, 85.2900, "religious", "A 17th-century hilltop temple modelled on the one in Puri, with fine views over the city."],
  ["Dassam Falls", "dassam-falls", "Dassam Falls", "Ranchi", "Jharkhand", "jharkhand", 23.1500, 85.5500, "nature", "A cascading waterfall in a forested gorge near Ranchi, a favourite picnic spot."],

  // ---------- Manipur ----------
  ["Loktak Lake", "loktak-lake", "Loktak Lake", "Moirang", "Manipur", "manipur", 24.5333, 93.8000, "nature", "The largest freshwater lake in the North East, dotted with floating islands called phumdis."],
  ["Keibul Lamjao National Park", "keibul-lamjao-national-park", "Keibul Lamjao National Park", "Bishnupur", "Manipur", "manipur", 24.4900, 93.8500, "nature", "The world's only floating national park, home of the rare Sangai deer."],
  ["Kangla Fort", "kangla-fort", "Kangla Fort", "Imphal", "Manipur", "manipur", 24.8085, 93.9458, "heritage", "The ancient seat of the Manipur kings and the cultural heart of Imphal."],
  ["Ima Keithel", "ima-keithel", "Ima Keithel (Mothers' Market)", "Imphal", "Manipur", "manipur", 24.8100, 93.9400, "cultural", "A unique market run entirely by women, with thousands of stalls selling textiles, produce and crafts."],
  ["Shree Govindajee Temple", "shree-govindajee-temple", "Shree Govindajee Temple", "Imphal", "Manipur", "manipur", 24.8180, 93.9380, "religious", "A golden-domed Vaishnavite temple, the centre of Manipuri classical dance and devotion."],
  ["Imphal War Cemetery", "imphal-war-cemetery", "Imphal War Cemetery", "Imphal", "Manipur", "manipur", 24.7970, 93.9400, "heritage", "A peaceful Commonwealth cemetery for the soldiers of the 1944 Battle of Imphal."],

  // ---------- Mizoram ----------
  ["Vantawng Falls", "vantawng-falls", "Vantawng Falls", "Thenzawl", "Mizoram", "mizoram", 23.2700, 92.8000, "nature", "The highest waterfall in Mizoram, plunging about 750 feet through dense forest."],
  ["Phawngpui National Park", "phawngpui-national-park", "Phawngpui (Blue Mountain)", "Lawngtlai", "Mizoram", "mizoram", 22.6200, 93.0300, "nature", "Mizoram's highest peak, with orchids, rhododendrons and wide views over the hills."],
  ["Tam Dil", "tam-dil-lake", "Tam Dil Lake", "Saitual", "Mizoram", "mizoram", 23.7400, 92.7200, "nature", "A calm natural lake ringed by forest, a favourite picnic spot near Aizawl."],
  ["Reiek", "reiek-peak", "Reiek Peak", "Aizawl", "Mizoram", "mizoram", 23.7000, 92.6000, "nature", "A scenic hilltop village with a heritage trail and sweeping views of the Mizo hills."],
  ["Solomon's Temple, Aizawl|Solomon's Temple", "solomons-temple-aizawl", "Solomon's Temple", "Aizawl", "Mizoram", "mizoram", 23.7320, 92.7210, "religious", "A large modern church in Aizawl, a landmark of the city's strong Christian heritage."],
  ["Murlen National Park", "murlen-national-park", "Murlen National Park", "Champhai", "Mizoram", "mizoram", 23.5500, 93.2600, "nature", "A hilly forest reserve on the Myanmar border, rich in birds and orchids."],

  // ---------- Nagaland ----------
  ["Kohima War Cemetery", "kohima-war-cemetery", "Kohima War Cemetery", "Kohima", "Nagaland", "nagaland", 25.6600, 94.1090, "heritage", "A moving Commonwealth cemetery on the old tennis court where the Battle of Kohima was fought."],
  ["Dzükou Valley|Dzukou Valley", "dzukou-valley", "Dzükou Valley", "Kohima", "Nagaland", "nagaland", 25.5500, 94.0600, "nature", "A high valley carpeted with wildflowers in summer, among the best trekking trails in the North East."],
  ["Naga Heritage Village|Kisama Heritage Village", "kisama-heritage-village", "Kisama Heritage Village", "Kohima", "Nagaland", "nagaland", 25.6370, 94.1150, "cultural", "The venue of the Hornbill Festival, with traditional houses of the Naga tribes."],
  ["Khonoma", "khonoma-village", "Khonoma Green Village", "Kohima", "Nagaland", "nagaland", 25.6400, 94.0000, "cultural", "A terraced Angami village known as Asia's first green village, steeped in warrior history."],
  ["Japfü|Japfu Peak", "japfu-peak", "Japfü Peak", "Kohima", "Nagaland", "nagaland", 25.6500, 94.0700, "nature", "The second-highest peak in Nagaland, with rhododendron forests and views over Kohima."],
  ["Shilloi Lake", "shilloi-lake", "Shilloi Lake", "Phek", "Nagaland", "nagaland", 25.7200, 94.4700, "nature", "A scenic lake in the Phek hills, wrapped in forest and legend."],
  ["Intanki National Park", "intanki-national-park", "Intanki National Park", "Dimapur", "Nagaland", "nagaland", 25.7500, 93.4200, "nature", "A wildlife reserve near Dimapur with elephants, hoolock gibbons and rich birdlife."],

  // ---------- Tripura ----------
  ["Ujjayanta Palace", "ujjayanta-palace", "Ujjayanta Palace", "Agartala", "Tripura", "tripura", 23.8365, 91.2820, "heritage", "A grand white royal palace with Mughal-style gardens, now the Tripura State Museum."],
  ["Neermahal", "neermahal", "Neermahal", "Melaghar", "Tripura", "tripura", 23.5100, 91.3100, "heritage", "A water palace in the middle of Rudrasagar Lake, a blend of Hindu and Mughal styles."],
  ["Unakoti", "unakoti", "Unakoti", "Kailashahar", "Tripura", "tripura", 24.3100, 92.0700, "heritage", "A hillside of giant rock-cut sculptures and carvings, a site of pilgrimage and mystery."],
  ["Tripura Sundari Temple", "tripura-sundari-temple", "Tripura Sundari Temple", "Udaipur", "Tripura", "tripura", 23.5214, 91.4851, "religious", "One of the 51 Shakti Peethas, a famous temple on a hillock overlooking a lake."],
  ["Sepahijala Wildlife Sanctuary", "sepahijala-wildlife-sanctuary", "Sepahijala Wildlife Sanctuary", "Bishalgarh", "Tripura", "tripura", 23.6800, 91.3000, "nature", "A forest sanctuary with a botanical garden, a lake and the rare spectacled langur."],
  ["Jampui Hills", "jampui-hills", "Jampui Hills", "Kailashahar", "Tripura", "tripura", 24.1500, 92.2800, "nature", "A misty range known for orange orchards, cool weather and sunrise views."],

  // ---------- Dadra & Nagar Haveli and Daman & Diu ----------
  ["Diu Fort", "diu-fort", "Diu Fort", "Diu", "Dadra & Nagar Haveli and Daman & Diu", "dadra-and-nagar-haveli-and-daman-and-diu", 20.7115, 70.9890, "heritage", "A sea-facing Portuguese fort of the 16th century, with massive walls and a lighthouse."],
  ["Nagoa Beach", "nagoa-beach-diu", "Nagoa Beach", "Diu", "Dadra & Nagar Haveli and Daman & Diu", "dadra-and-nagar-haveli-and-daman-and-diu", 20.7130, 70.9040, "nature", "A horseshoe-shaped beach lined with palms, the most popular on Diu island."],
  ["St. Paul's Church, Diu|St Paul's Church, Diu", "st-pauls-church-diu", "St. Paul's Church Diu", "Diu", "Dadra & Nagar Haveli and Daman & Diu", "dadra-and-nagar-haveli-and-daman-and-diu", 20.7160, 70.9870, "religious", "A baroque Portuguese-era church with a whitewashed facade, one of the finest in the region."],
  ["Naida Caves", "naida-caves", "Naida Caves", "Diu", "Dadra & Nagar Haveli and Daman & Diu", "dadra-and-nagar-haveli-and-daman-and-diu", 20.7150, 70.9800, "nature", "Underground limestone caves carved by quarrying, with light shafts and strange rock shapes."],
  ["Moti Daman Fort|Daman Fort", "moti-daman-fort", "Moti Daman Fort", "Daman", "Dadra & Nagar Haveli and Daman & Diu", "dadra-and-nagar-haveli-and-daman-and-diu", 20.4136, 72.8300, "heritage", "A walled Portuguese fort town with old churches, whitewashed houses and sea views."],

  // ---------- Lakshadweep ----------
  ["Agatti Island", "agatti-island", "Agatti Island", "Agatti", "Lakshadweep", "lakshadweep", 10.8590, 72.1830, "nature", "The gateway to Lakshadweep, a coral island of white sand, a clear lagoon and water sports."],
  ["Bangaram", "bangaram-island", "Bangaram Island", "Bangaram", "Lakshadweep", "lakshadweep", 10.9400, 72.2900, "nature", "An uninhabited coral atoll with a turquoise lagoon, one of India's most beautiful beaches."],
  ["Kavaratti", "kavaratti-island", "Kavaratti Island", "Kavaratti", "Lakshadweep", "lakshadweep", 10.5669, 72.6420, "nature", "The capital of Lakshadweep, with a calm lagoon, a marine aquarium and glass-bottom boat rides."],
  ["Minicoy", "minicoy-island", "Minicoy Island", "Minicoy", "Lakshadweep", "lakshadweep", 8.2800, 73.0500, "nature", "The southernmost island, with a historic lighthouse and a distinct Maldivian culture."],
  ["Kadmat Island", "kadmat-island", "Kadmat Island", "Kadmat", "Lakshadweep", "lakshadweep", 11.2200, 72.7700, "nature", "A long narrow island known for scuba diving, water sports and its calm lagoon."],

  // ---------- Chhattisgarh ----------
  ["Bhoramdeo Temple", "bhoramdeo-temple", "Bhoramdeo Temple", "Kawardha", "Chhattisgarh", "chhattisgarh", 22.1100, 81.1500, "heritage", "A 11th-century stone temple with erotic and religious carvings, called the Khajuraho of Chhattisgarh."],
  ["Kanger Valley National Park", "kanger-valley-national-park", "Kanger Valley National Park", "Jagdalpur", "Chhattisgarh", "chhattisgarh", 18.9000, 82.0500, "nature", "A dense forest reserve with limestone caves and waterfalls, famous for the Kutumsar Cave."],
  ["Sirpur, Chhattisgarh|Sirpur", "sirpur-chhattisgarh", "Sirpur Temples", "Mahasamund", "Chhattisgarh", "chhattisgarh", 21.3500, 82.1800, "heritage", "An archaeological site of ancient brick temples and Buddhist monasteries on the Mahanadi."],
  ["Tirathgarh Falls", "tirathgarh-falls", "Tirathgarh Falls", "Jagdalpur", "Chhattisgarh", "chhattisgarh", 18.8800, 81.9800, "nature", "A multi-tiered waterfall in the Kanger valley, falling in a series of white steps."],
  ["Danteshwari Temple", "danteshwari-temple", "Danteshwari Temple", "Dantewada", "Chhattisgarh", "chhattisgarh", 18.8980, 81.3490, "religious", "A Shakti Peetha temple of the goddess Danteshwari, the centre of Bastar's tribal faith."],

  // ---------- Chandigarh ----------
  ["Sukhna Lake", "sukhna-lake", "Sukhna Lake", "Chandigarh", "Chandigarh", "chandigarh", 30.7421, 76.8188, "nature", "A man-made lake at the foot of the Shivaliks, for boating, walks and sunsets."],
  ["Capitol Complex, Chandigarh", "capitol-complex-chandigarh", "Capitol Complex", "Chandigarh", "Chandigarh", "chandigarh", 30.7586, 76.8049, "heritage", "Le Corbusier's government buildings, a UNESCO World Heritage Site of modernist architecture."],
  ["Zakir Hussain Rose Garden", "zakir-hussain-rose-garden", "Zakir Hussain Rose Garden", "Chandigarh", "Chandigarh", "chandigarh", 30.7480, 76.7740, "nature", "Asia's largest rose garden, with thousands of varieties in bloom in spring."],
  ["Open Hand Monument", "open-hand-monument", "Open Hand Monument", "Chandigarh", "Chandigarh", "chandigarh", 30.7600, 76.8040, "landmark", "Le Corbusier's giant open hand symbol, the emblem of peace and the city of Chandigarh."],

  // ---------- Bihar ----------
  ["Golghar", "golghar-patna", "Golghar", "Patna", "Bihar", "bihar", 25.6194, 85.1380, "heritage", "A beehive-shaped granary of 1786, with a spiral staircase and views over the Ganga."],
  ["Vishnupad Temple", "vishnupad-temple", "Vishnupad Temple", "Gaya", "Bihar", "bihar", 24.7970, 85.0000, "religious", "A sacred temple with a footprint of Vishnu, central to pind daan rituals in Gaya."],
  ["Rajgir", "rajgir", "Rajgir", "Rajgir", "Bihar", "bihar", 25.0250, 85.4200, "heritage", "An ancient hill city tied to the Buddha and Mahavira, with hot springs and the Vishwa Shanti Stupa."],
  ["Vikramashila", "vikramashila", "Vikramshila Ruins", "Bhagalpur", "Bihar", "bihar", 25.3200, 87.2800, "heritage", "The ruins of a great ancient Buddhist university, founded in the 8th century."],

  // ---------- Meghalaya ----------
  ["Umiam Lake", "umiam-lake", "Umiam Lake", "Shillong", "Meghalaya", "meghalaya", 25.6600, 91.8900, "nature", "A large reservoir in the hills near Shillong, for boating, kayaking and mountain views."],
  ["Mawlynnong", "mawlynnong", "Mawlynnong Village", "East Khasi Hills", "Meghalaya", "meghalaya", 25.2020, 91.9170, "cultural", "Often called Asia's cleanest village, with flower gardens, bamboo paths and a sky view tower."],
  ["Elephant Falls", "elephant-falls-shillong", "Elephant Falls", "Shillong", "Meghalaya", "meghalaya", 25.5380, 91.8130, "nature", "A three-tiered waterfall surrounded by ferns and forest, a classic Shillong stop."],
  ["Umngot River", "umngot-river-dawki", "Umngot River, Dawki", "Dawki", "Meghalaya", "meghalaya", 25.1830, 92.0300, "nature", "A river so clear that boats appear to float in air, on the border with Bangladesh."],

  // ---------- Sikkim ----------
  ["Nathu La", "nathu-la", "Nathu La Pass", "Gangtok", "Sikkim", "sikkim", 27.3875, 88.8310, "landmark", "A high Himalayan pass on the old Silk Route, on the border with Tibet."],
  ["Yumthang Valley|Yumthang", "yumthang-valley", "Yumthang Valley", "Lachung", "Sikkim", "sikkim", 27.8200, 88.7000, "nature", "The Valley of Flowers of Sikkim, rich in rhododendrons, hot springs and snow peaks."],
  ["Khecheopalri Lake", "khecheopalri-lake", "Khecheopalri Lake", "Pelling", "Sikkim", "sikkim", 27.3800, 88.2000, "religious", "A sacred wishing lake in the forest, said to be kept free of leaves by the birds."],
  ["Pemayangtse Monastery", "pemayangtse-monastery", "Pemayangtse Monastery", "Pelling", "Sikkim", "sikkim", 27.3012, 88.2330, "religious", "One of Sikkim's oldest and most important monasteries, with views of Kanchenjunga."],

  // ---------- Puducherry ----------
  ["Sri Aurobindo Ashram", "sri-aurobindo-ashram", "Sri Aurobindo Ashram", "Puducherry", "Puducherry", "puducherry", 11.9338, 79.8300, "religious", "A spiritual community founded by Sri Aurobindo and the Mother, at the heart of the French Quarter."],
  ["Basilica of the Sacred Heart of Jesus, Puducherry|Sacred Heart Basilica, Puducherry", "sacred-heart-basilica-puducherry", "Sacred Heart Basilica", "Puducherry", "Puducherry", "puducherry", 11.9211, 79.8138, "religious", "A Gothic church with striking stained glass, one of the finest churches in South India."],
  ["Paradise Beach, Puducherry|Paradise Beach", "paradise-beach-puducherry", "Paradise Beach", "Puducherry", "Puducherry", "puducherry", 11.8800, 79.8300, "nature", "A calm golden beach reached by boat through backwaters, known for its serene setting."],
  ["Arikamedu", "arikamedu", "Arikamedu", "Puducherry", "Puducherry", "puducherry", 11.9100, 79.7900, "heritage", "An ancient Roman-era trading port, with excavated remains of brick structures on the Ariyankuppam river."],

  // ---------- Andhra Pradesh ----------
  ["Undavalli Caves", "undavalli-caves", "Undavalli Caves", "Vijayawada", "Andhra Pradesh", "andhra-pradesh", 16.4960, 80.5800, "heritage", "A 7th-century rock-cut cave temple of four storeys, with a giant reclining Vishnu."],
  ["Lepakshi", "lepakshi-temple", "Lepakshi Veerabhadra Temple", "Lepakshi", "Andhra Pradesh", "andhra-pradesh", 13.8050, 77.6080, "religious", "A Vijayanagara temple known for its hanging pillar, giant Nandi bull and fine murals."],
  ["Belum Caves", "belum-caves", "Belum Caves", "Kurnool", "Andhra Pradesh", "andhra-pradesh", 15.1050, 78.1100, "nature", "The second-longest cave system in India, with deep halls of stalactites and stalagmites."],

  // ---------- Assam ----------
  ["Manas National Park", "manas-national-park", "Manas National Park", "Barpeta", "Assam", "assam", 26.7000, 91.0000, "nature", "A UNESCO World Heritage reserve of grassland and forest, home of tigers, rhinos and golden langurs."],
  ["Rang Ghar", "rang-ghar", "Rang Ghar", "Sivasagar", "Assam", "assam", 26.9780, 94.6260, "heritage", "One of Asia's oldest surviving amphitheatres, built by the Ahom kings for sporting events."],
  ["Umananda Temple", "umananda-temple", "Umananda Temple", "Guwahati", "Assam", "assam", 26.1950, 91.7440, "religious", "A Shiva temple on a small river island in the Brahmaputra, reached by ferry."],

  // ---------- Himachal Pradesh ----------
  ["McLeod Ganj", "mcleod-ganj", "McLeod Ganj", "Dharamshala", "Himachal Pradesh", "himachal-pradesh", 32.2426, 76.3213, "cultural", "The home of the Dalai Lama and the Tibetan government in exile, with monasteries and mountain views."],
  ["Dalhousie, Himachal Pradesh|Dalhousie", "dalhousie", "Dalhousie", "Dalhousie", "Himachal Pradesh", "himachal-pradesh", 32.5388, 75.9710, "nature", "A colonial hill station spread over five hills, with pine forests and old churches."],
  ["Great Himalayan National Park", "great-himalayan-national-park", "Great Himalayan National Park", "Kullu", "Himachal Pradesh", "himachal-pradesh", 31.7400, 77.4500, "nature", "A UNESCO World Heritage park of glaciers, alpine meadows and rare Himalayan wildlife."],

  // ---------- Madhya Pradesh ----------
  ["Bhimbetka rock shelters", "bhimbetka-rock-shelters", "Bhimbetka Rock Shelters", "Raisen", "Madhya Pradesh", "madhya-pradesh", 22.9380, 77.6130, "heritage", "Prehistoric rock shelters with cave paintings thousands of years old, a UNESCO World Heritage Site."],
  ["Orchha", "orchha", "Orchha", "Orchha", "Madhya Pradesh", "madhya-pradesh", 25.3518, 78.6400, "heritage", "A medieval town of palaces, temples and royal cenotaphs beside the Betwa river."],
  ["Kanha National Park", "kanha-national-park", "Kanha National Park", "Mandla", "Madhya Pradesh", "madhya-pradesh", 22.3345, 80.6115, "nature", "A famous tiger reserve of sal forest and meadows, said to inspire The Jungle Book."],

  // ---------- Punjab ----------
  ["Qila Mubarak", "qila-mubarak-bathinda", "Qila Mubarak", "Bathinda", "Punjab", "punjab", 30.2110, 74.9455, "heritage", "One of the oldest surviving forts in India, with a history stretching back about 1,800 years."],
  ["Sheesh Mahal, Patiala|Sheesh Mahal", "sheesh-mahal-patiala", "Sheesh Mahal Patiala", "Patiala", "Punjab", "punjab", 30.3330, 76.4000, "heritage", "A royal palace of mirrors and paintings, set in a lovely garden by a lake."],
  ["Partition Museum", "partition-museum", "Partition Museum", "Amritsar", "Punjab", "punjab", 31.6260, 74.8770, "cultural", "A museum telling the stories of the 1947 Partition through objects, letters and personal accounts."],

  // ---------- Telangana ----------
  ["Ramappa Temple", "ramappa-temple", "Ramappa Temple", "Warangal", "Telangana", "telangana", 18.2590, 79.9430, "heritage", "A 13th-century Kakatiya temple of floating bricks and fine carvings, a UNESCO World Heritage Site."],
  ["Warangal Fort", "warangal-fort", "Warangal Fort", "Warangal", "Telangana", "telangana", 17.9500, 79.6000, "heritage", "A fort of the Kakatiya dynasty, with ornamental stone gateways and a ruined Shiva temple."],
  ["Salar Jung Museum", "salar-jung-museum", "Salar Jung Museum", "Hyderabad", "Telangana", "telangana", 17.3714, 78.4804, "cultural", "One of the largest one-man art collections in the world, in the heart of old Hyderabad."],

  // ---------- Jammu & Kashmir ----------
  ["Pahalgam", "pahalgam", "Pahalgam", "Pahalgam", "Jammu & Kashmir", "jammu-and-kashmir", 34.0161, 75.3150, "nature", "A valley resort on the Lidder river, the base for the Amarnath yatra and Himalayan treks."],
  ["Vaishno Devi", "vaishno-devi", "Vaishno Devi Temple", "Katra", "Jammu & Kashmir", "jammu-and-kashmir", 33.0300, 74.9490, "religious", "One of India's most visited shrines, reached by a trek or ride from Katra."],
  ["Sonamarg", "sonamarg", "Sonamarg", "Sonamarg", "Jammu & Kashmir", "jammu-and-kashmir", 34.3000, 75.2900, "nature", "The Meadow of Gold, with glaciers, alpine lakes and the gateway to Ladakh."],

  // ---------- Gujarat ----------
  ["Rani ki Vav", "rani-ki-vav", "Rani ki Vav", "Patan", "Gujarat", "gujarat", 23.8593, 72.1020, "heritage", "An 11th-century stepwell carved like an inverted temple, a UNESCO World Heritage Site."],
  ["Dwarkadhish Temple", "dwarkadhish-temple", "Dwarkadhish Temple", "Dwarka", "Gujarat", "gujarat", 22.2379, 68.9676, "religious", "A major Krishna temple on the coast, one of the Char Dham pilgrimage sites."],
  ["Modhera Sun Temple", "modhera-sun-temple", "Modhera Sun Temple", "Mehsana", "Gujarat", "gujarat", 23.5835, 72.1330, "heritage", "A grand 11th-century temple of the Sun, with a stepped tank and carved pillars."],

  // ---------- Uttarakhand ----------
  ["Naini Lake", "naini-lake", "Naini Lake", "Nainital", "Uttarakhand", "uttarakhand", 29.3919, 79.4542, "nature", "A crescent-shaped lake in the hills, the heart of the Nainital hill station."],
  ["Kedarnath Temple", "kedarnath-temple", "Kedarnath Temple", "Kedarnath", "Uttarakhand", "uttarakhand", 30.7352, 79.0669, "religious", "A high Himalayan Shiva temple, one of the twelve Jyotirlingas and Char Dham sites."],
  ["Auli, Uttarakhand|Auli", "auli", "Auli", "Joshimath", "Uttarakhand", "uttarakhand", 30.5290, 79.5670, "nature", "A ski resort and meadow with views of Nanda Devi and other snow peaks."],

  // ---------- West Bengal ----------
  ["Dakshineswar Kali Temple", "dakshineswar-kali-temple", "Dakshineswar Kali Temple", "Kolkata", "West Bengal", "west-bengal", 22.6549, 88.3578, "religious", "A famous riverside temple of Goddess Kali, linked with Sri Ramakrishna."],
  ["Belur Math", "belur-math", "Belur Math", "Howrah", "West Bengal", "west-bengal", 22.6320, 88.3560, "religious", "The headquarters of the Ramakrishna Mission, a temple blending Hindu, Islamic and Christian styles."],

  // ---------- Ladakh ----------
  ["Hemis Monastery", "hemis-monastery", "Hemis Monastery", "Leh", "Ladakh", "ladakh", 33.9120, 77.7050, "religious", "The largest and richest monastery in Ladakh, famous for its masked dance festival."],
  ["Khardung La", "khardung-la", "Khardung La", "Leh", "Ladakh", "ladakh", 34.2784, 77.6040, "nature", "One of the highest motorable passes in the world, the gateway to the Nubra valley."],

  // ---------- Odisha ----------
  ["Dhauli", "dhauli-shanti-stupa", "Dhauli Shanti Stupa", "Bhubaneswar", "Odisha", "odisha", 20.1925, 85.8390, "religious", "A white peace pagoda on the site of the Kalinga war, with Ashoka's rock edicts nearby."],
  ["Bhitarkanika National Park", "bhitarkanika-national-park", "Bhitarkanika National Park", "Kendrapara", "Odisha", "odisha", 20.7400, 86.8700, "nature", "A mangrove reserve with giant saltwater crocodiles and a huge number of migratory birds."],
];

module.exports = buildPlaces(ROWS);
