/* Novuss — interface: rendering, input, computer turns, sound, translations. */
(function () {
  'use strict';

  const N = window.Novuss, C = N.C, F = C.FIELD;
  const $ = s => document.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const MAX_PULL = 170;   // mm of pull-back for full power
  const LOG_KEEP = 10000; // log entries kept, as on the server

  /* ------------------------------------------------------------ strings */

  const STR = {
    en: {
      tagline: 'The Latvian cue board game, played by the LNF rules.',
      opponent: 'Opponent', vsAI: 'Computer', vsHuman: 'Two players',
      level: 'Level', easy: 'Easy', medium: 'Medium', hard: 'Hard',
      match: 'Match', sets1: 'One set', sets3: 'Best of 3', sets5: 'Best of 5',
      names: 'Names', p1: 'Player 1', p2: 'Player 2', computer: 'Computer',
      language: 'Language', start: 'New match', resume: 'Resume', rules: 'Rules', rulesTitle: 'How to play',
      close: 'Close', menu: 'Menu', sound: 'Sound', about: 'About this site',
      setInfo: 'Set {n} · first to {w}', yourShot: '{name} to shoot', thinking: '{name} is thinking…',
      placeHint: 'drag the striker, then pull back anywhere to aim',
      power: 'Power {n}%', aimBad: 'cue over the corner — not allowed',
      debtBadge: 'debt {n}', coin: 'Coin toss: {name} takes the first shot.', turnOf: '{name}',
      setWon: '{name} wins set {n}', matchWon: '{name} wins the match', replayTitle: 'Set replayed',
      nextSet: 'Next set', newMatch: 'New match', cont: 'Continue',
      pen_noContact: 'Penalty — the striker touched none of your light pucks (2.8).',
      pen_oppFirst: "Penalty — the striker hit an opponent's puck first (7.1.2).",
      pen_oppFirstRebound: "Penalty — after the rebound the striker hit an opponent's puck first while you still have light pucks (7.1.3).",
      pen_darkDirect: 'Penalty — a direct shot first touched a puck in your edge zone or your dark puck in the circle (4.1, 7.1.8).',
      pen_onlyDark: 'Penalty — with only dark pucks left, play off the far cushion, or off a side cushion onto your puck in the circle (7.1.6).',
      pen_strikerPocket: 'Penalty — the striker fell into a pocket (7.1.4).',
      pen_strikerOff: 'Penalty — the striker left the table (7.1.5).',
      restored: '{n} puck(s) put back where they were (4.6, 4.8, 7.1.8).',
      pocketed: 'Pocketed {n} — shoot again (3.16).',
      oppPocketed: "{n} opponent's puck(s) pocketed — they count for the opponent; turn passes (6.1.2).",
      off: 'A puck flew off the table — it goes to the centre circle; turn passes (3.20, 6.1.3).',
      returned: 'The striker slid back into your edge zone — turn passes (3.15, 6.1.5).',
      noOwn: 'None of your pucks pocketed — turn passes (6.1.1).',
      penaltyPlaced: 'A penalty puck goes back at the far cushion (7.3).',
      debt: 'All your pucks are on the table, so the penalty becomes a debt (7.4).',
      debtPlaced: '{n} debt puck(s) placed (7.5).',
      debtPlacedOpp: "Opponent's {n} debt puck(s) placed (7.5).",
      firstClear: '{name} cleared all eight in the first series — the opponent gets one series to match it (12.4).',
      lost_814: 'A direct shot hit a puck in the dark zone and moved other pucks too (8.1.4).',
      lost_811: 'A penalised shot knocked two or more own pucks out of the dark area (8.1.1).',
      lost_bothLast: 'Both last pucks fell, but the shot earned a penalty (12.5).',
      lost_lastFoul: 'Both cleared in their first series, but the last shot lost the turn (12.4).',
      win: '{name} pocketed all eight pucks (12.3).',
      win_oppLast: "{name}'s last puck was pocketed by the opponent, so the set goes to {name}.",
      win_firstClear: '{name} cleared in the first series and the reply fell short (12.4).',
      replay_bothLast: 'Both last pucks fell in one shot — the set is replayed (12.5).',
      replay_bothClear: 'Both players cleared in their first series — replayed with sides and first shot swapped (12.4).',
      replay_stuck: 'Both players had only dark pucks and missed three times each — the set restarts (12.6).',
      invalidAim: 'The cue must lie over your own cushion, clear of its corners (3.32).',
      vsOnline: 'Online', onlineNote: 'You get a link to send; your opponent plays from their own device.',
      lobbyTitle: 'Invite your opponent', lobbyText: 'Send this link. The match starts as soon as they open it.',
      copy: 'Copy', copied: 'Copied', share: 'Share', cancel: 'Cancel',
      waiting: 'Waiting for your opponent…', connecting: 'Connecting…',
      joinTitle: 'You are invited to a match', joinHost: '{name} is waiting at the table.', joinAnon: 'Your opponent is waiting at the table.',
      full: 'Both seats are taken — you can watch.', noRoom: 'This match link has expired or never existed.',
      yourName: 'Your name', join: 'Join', watch: 'Watch', backToMenu: 'Menu',
      you: '(you)', offline: 'offline', watching: 'Watching',
      remoteTurn: '{name} is aiming…', oppOffline: '{name} is offline — waiting for them to return',
      reconnecting: 'Connection lost — reconnecting…', serverDown: 'Cannot reach the game server — retrying…',
      netError: 'The server did not accept that shot — position reloaded.', rematch: 'Rematch',
      logTitle: 'Game log', chatPlaceholder: 'Message…', send: 'Send', guide: 'Aim line',
      hints: 'Dark puck hints', spectator: 'Spectator', setHeader: 'Set {n}',
      helpersNote: 'Chosen when a match starts and fixed for it. Online, the host’s choice applies to both players.',
      helpersIn: 'Helpers in this match: {list}.', none: 'none',
      updating: 'A new version is out — reloading…',
      helpers: 'Helpers', slowDown: 'One message a second, please.', setsWon: 'sets {n}/{w}', setsTitle: 'Sets won / sets needed to win the match', onTable: 'Pucks still on the table: {n}'
    },
    lv: {
      tagline: 'Latviešu galda spēle — pēc LNF noteikumiem.',
      opponent: 'Pretinieks', vsAI: 'Dators', vsHuman: 'Divi spēlētāji',
      level: 'Līmenis', easy: 'Viegls', medium: 'Vidējs', hard: 'Grūts',
      match: 'Spēle', sets1: 'Viens sets', sets3: 'Līdz 2 uzvarām', sets5: 'Līdz 3 uzvarām',
      names: 'Vārdi', p1: 'Spēlētājs 1', p2: 'Spēlētājs 2', computer: 'Dators',
      language: 'Valoda', start: 'Jauna spēle', resume: 'Turpināt', rules: 'Noteikumi', rulesTitle: 'Kā spēlēt',
      close: 'Aizvērt', menu: 'Izvēlne', sound: 'Skaņa', about: 'Par šo vietni',
      setInfo: '{n}. sets · līdz {w} uzvarām', yourShot: 'Sit: {name}', thinking: '{name} domā…',
      placeHint: 'pavelc ripu, tad velc atpakaļ jebkur, lai tēmētu',
      power: 'Spēks {n}%', aimBad: 'kija aizsedz stūri — nedrīkst',
      debtBadge: 'parāds {n}', coin: 'Izloze: pirmā sitiena tiesības — {name}.', turnOf: '{name}',
      setWon: '{n}. setu uzvar: {name}', matchWon: 'Spēles uzvarētājs: {name}', replayTitle: 'Setu pārspēlē',
      nextSet: 'Nākamais sets', newMatch: 'Jauna spēle', cont: 'Turpināt',
      pen_noContact: 'Sods — ripa neskāra nevienu tavu gaišo kauliņu (2.8.).',
      pen_oppFirst: 'Sods — ripa vispirms skāra pretinieka kauliņu (7.1.2.).',
      pen_oppFirstRebound: 'Sods — ripa pēc atsitiena vispirms skāra pretinieka kauliņu, lai gan tev vēl ir gaišie kauliņi (7.1.3.).',
      pen_darkDirect: 'Sods — ar tiešu sitienu vispirms skarts kauliņš tavā apmales zonā vai tavs tumšais kauliņš vidus aplī (4.1., 7.1.8.).',
      pen_onlyDark: 'Sods — ja palikuši tikai tumšie kauliņi, ripai jāskar pretējā apmale vai sānu apmale un tad savs kauliņš vidus aplī (7.1.6.).',
      pen_strikerPocket: 'Sods — ripa iekrita maisiņā (7.1.4.).',
      pen_strikerOff: 'Sods — ripa pārkrita pāri apmalei (7.1.5.).',
      restored: 'Atjaunota kauliņu pozīcija: {n} (4.6., 4.8., 7.1.8.).',
      pocketed: 'Iesists: {n} — sit vēlreiz (3.16.).',
      oppPocketed: 'Iesisti pretinieka kauliņi: {n} — tie skaitās pretiniekam, sitiena tiesības pāriet (6.1.2.).',
      off: 'Kauliņš pārkrita pāri apmalei — to noliek vidus aplī, sitiena tiesības pāriet (3.20., 6.1.3.).',
      returned: 'Ripa atpakaļgājienā pārslīdēja tavas apmales zonas līniju — sitiena tiesības pāriet (3.15., 6.1.5.).',
      noOwn: 'Neviens tavs kauliņš nav iesists — sitiena tiesības pāriet (6.1.1.).',
      penaltyPlaced: 'Soda kauliņš izlikts pie pretējās apmales (7.3.).',
      debt: 'Visi tavi kauliņi ir uz galda, tāpēc sods tiek skaitīts kā parāds (7.4.).',
      debtPlaced: 'Izlikti parāda kauliņi: {n} (7.5.).',
      debtPlacedOpp: 'Izlikti pretinieka parāda kauliņi: {n} (7.5.).',
      firstClear: '{name} ar pirmo sitienu sēriju iesita visus astoņus — pretiniekam ir viena sērija atbildei (12.4.).',
      lost_814: 'Ar tiešu sitienu skarts kauliņš tumšajā laukumā, un izkustējās arī citi kauliņi (8.1.4.).',
      lost_811: 'Ar sodāmu sitienu no tumšā laukuma izsisti divi vai vairāki savi kauliņi (8.1.1.).',
      lost_bothLast: 'Abi pēdējie kauliņi iekrita, bet sitiens bija sodāms (12.5.).',
      lost_lastFoul: 'Abi iesita visus ar pirmo sēriju, bet pie pēdējā sitiena zaudētas sitiena tiesības (12.4.).',
      win: '{name} iesita visus astoņus kauliņus (12.3.).',
      win_oppLast: 'Pretinieks iesita pēdējo kauliņu, tāpēc sets pienākas: {name}.',
      win_firstClear: '{name} iesita visus ar pirmo sēriju, un pretinieka atbilde neizdevās (12.4.).',
      replay_bothLast: 'Abi pēdējie kauliņi iekrita vienā sitienā — setu pārspēlē (12.5.).',
      replay_bothClear: 'Abi iesita visus ar pirmo sēriju — setu pārspēlē, mainot galda puses un pirmā sitiena tiesības (12.4.).',
      replay_stuck: 'Abiem palika tikai tumšie kauliņi, un katrs trīs reizes netrāpīja — setu sāk no jauna (12.6.).',
      invalidAim: 'Kijai jābūt virs savas apmales, neaizsedzot tās stūrus (3.32.).',
      vsOnline: 'Tiešsaistē', onlineNote: 'Saņemsi saiti, ko nosūtīt; pretinieks spēlēs no savas ierīces.',
      lobbyTitle: 'Uzaicini pretinieku', lobbyText: 'Nosūti šo saiti. Spēle sāksies, tiklīdz pretinieks to atvērs.',
      copy: 'Kopēt', copied: 'Nokopēts', share: 'Dalīties', cancel: 'Atcelt',
      waiting: 'Gaida pretinieku…', connecting: 'Savienojas…',
      joinTitle: 'Tevi aicina uz spēli', joinHost: '{name} gaida pie galda.', joinAnon: 'Pretinieks gaida pie galda.',
      full: 'Abas vietas ir aizņemtas — vari skatīties.', noRoom: 'Šī spēles saite vairs nav derīga.',
      yourName: 'Tavs vārds', join: 'Pievienoties', watch: 'Skatīties', backToMenu: 'Izvēlne',
      you: '(tu)', offline: 'bezsaistē', watching: 'Skatās',
      remoteTurn: '{name} tēmē…', oppOffline: '{name} ir bezsaistē — gaidām atgriešanos',
      reconnecting: 'Savienojums pārtrūka — atjauno…', serverDown: 'Nevar sasniegt spēles serveri — mēģina vēlreiz…',
      netError: 'Serveris nepieņēma sitienu — pozīcija ielādēta no jauna.', rematch: 'Revanšs',
      logTitle: 'Spēles žurnāls', chatPlaceholder: 'Ziņa…', send: 'Sūtīt', guide: 'Tēmēšanas līnija',
      hints: 'Tumšo kauliņu padomi', spectator: 'Skatītājs', setHeader: '{n}. sets',
      helpersNote: 'Izvēlas, sākot spēli, un spēles laikā tos mainīt nevar. Tiešsaistē abiem spēlētājiem der spēles veidotāja izvēle.',
      helpersIn: 'Palīgi šajā spēlē: {list}.', none: 'nav',
      updating: 'Ir jauna versija — lapa tiek pārlādēta…',
      helpers: 'Palīgi', slowDown: 'Lūdzu, ne vairāk kā vienu ziņu sekundē.', setsWon: 'seti {n}/{w}', setsTitle: 'Uzvarētie seti / seti, kas vajadzīgi uzvarai spēlē', onTable: 'Kauliņi vēl uz galda: {n}'
    }
  };

  const RULES = {
    en: `
<h3>Goal</h3>
<p>Each player has eight pucks — red or black — set in a row against the cushion on the opponent's side (1.2). Pocket all eight before your opponent does (12.3). You play the larger wooden striker from the edge zone on your own side (3.9).</p>
<h3>Controls</h3>
<p>Drag the striker to place it anywhere in your edge zone: its hole must stay clear of the lines and it may not touch a puck (3.9, 3.10). Then press anywhere and pull back, as if drawing the cue: the striker flies away from your pointer, and the further you pull the harder the shot. Release to shoot, or release close to the striker to cancel. Hold <kbd>Shift</kbd> for fine aim, <kbd>Esc</kbd> cancels, arrow keys nudge the striker. The aim line and the dark-puck hints are chosen in the menu before a match and stay fixed for it; online, the host’s choice applies to both players. The speech-bubble button shows or hides the game log and chat.</p>
<h3>Light and dark pucks</h3>
<p>Your puck is <b>dark</b> when it lies in the band along your own cushion or inside the centre circle and the line no longer shows through its hole (2.13). All your other pucks are <b>light</b>. With hints on, <span class="legend dark"></span>marks your dark pucks. Pieces in your own edge zone, whoever owns them, may not be hit first with a direct shot (3.10); with the aim line on, it turns red when it points at one.</p>
<h3>A correct shot</h3>
<p>The striker must first touch one of your light pucks (2.8.3). After a cushion it may first touch any of your pucks (4.2). With only dark pucks left, play off the far cushion, or off a side cushion onto your puck in the circle (2.8.4, 2.8.5). A direct shot must never first touch a piece in your edge zone or your dark puck in the circle (4.1).</p>
<h3>Keeping the turn</h3>
<p>Pocket at least one of your pucks and you shoot again (3.16). The turn passes if you pocket none of yours, pocket an opponent's puck (it counts for them), knock a puck off the table, or let the striker slide back over your zone line while you have no dark pucks (6.1).</p>
<h3>Penalties</h3>
<p>A wrong first contact, the striker in a pocket and the other faults above cost the turn and a penalty puck: one of your pocketed pucks returns to the midline at the far cushion (7.1, 7.3). With all eight still on the table the penalty becomes a debt, paid as soon as you have pocketed a puck (7.4–7.6). Pieces moved by an illegal shot may be put back (4.6, 4.8). A direct hit on a dark-zone piece that moves others as well loses the set (8.1.4).</p>
<h3>Sets</h3>
<p>Players change sides after every set and the first shot alternates (12.2). Clearing all eight in your first series gives the opponent one series to reply; if they clear too, the set is replayed with sides and first shot swapped (12.4). Both last pucks in one shot replays the set (12.5).</p>
<h3>About this version</h3>
<p class="note">Follows the Latvian Novuss Federation rules approved on 9 March 2024 and amended on 9 March 2025, for singles. Not modelled: doubles, the 30-second shot clock, warnings, and pucks landing on edge or on each other. A puck flies off the table only when it hits a cushion very hard. Where the rules leave room, this version decides as follows: pocketing your last puck on a shot that loses the turn loses the set (after the note to 12.4), and pocketing your opponent's last puck gives them the set. In online matches the server checks and plays every shot, so both players always see the same table.</p>
<h3>Sources</h3>
<ul class="sources">
<li><a href="https://novuss-lnf.lv/novusa-speles-noteikumi" target="_blank" rel="noopener">Latvian Novuss Federation — Novusa spēles noteikumi</a> (<a href="https://novuss-lnf.lv/wp-content/uploads/2025/03/Novusa-noteikumi-papildinajums-9.03.2025.pdf" target="_blank" rel="noopener">PDF</a>): the rules and equipment sizes this game follows.</li>
<li><a href="https://novussusa.com/?p=24" target="_blank" rel="noopener">US Novuss Association rules</a> and <a href="https://latviansonline.com/novuss-a-guide-to-playing-the-game/" target="_blank" rel="noopener">Novuss: a guide to playing the game</a> (Latvians Online): consulted for context; where they differ, the LNF rules win.</li>
<li><a href="https://en.wikipedia.org/wiki/Novuss" target="_blank" rel="noopener">Novuss on Wikipedia</a>: background.</li>
</ul>
<h3 id="about">About this site</h3>
<p>Made by laacz — <a href="https://laacz.lv" target="_blank" rel="noopener">laacz.lv</a>, part of <a href="https://didnt.work" target="_blank" rel="noopener">didnt.work</a>. Feedback is welcome on <a href="https://twitter.com/laacz" target="_blank" rel="noopener">Twitter (@laacz)</a> or by email at <a href="mailto:laacz@laacz.lv?subject=Novuss">laacz@laacz.lv</a>.</p>`,
    lv: `
<h3>Mērķis</h3>
<p>Katram spēlētājam ir astoņi kauliņi — sarkani vai melni —, kas salikti rindā pie apmales pretinieka pusē (1.2.). Jāiesit maisiņos visi savi astoņi kauliņi ātrāk par pretinieku (12.3.). Sit ar lielāko koka ripu no savas puses apmales zonas (3.9.).</p>
<h3>Vadība</h3>
<p>Pavelc ripu, lai to noliktu jebkur savā apmales zonā: tās caurumā nedrīkst būt redzamas līnijas, un tā nedrīkst skart kauliņus (3.9., 3.10.). Tad nospied jebkur un velc atpakaļ kā kiju: ripa aizslīd prom no rādītāja, un jo tālāk velc, jo stiprāks sitiens. Atlaid, lai sistu, vai atlaid pie pašas ripas, lai atceltu. <kbd>Shift</kbd> — precīza tēmēšana, <kbd>Esc</kbd> — atcelt, bultiņas pabīda ripu. Tēmēšanas līniju un tumšo kauliņu padomus izvēlas izvēlnē pirms spēles, un spēles laikā tie nemainās; tiešsaistē abiem spēlētājiem der spēles veidotāja izvēle. Ar runas burbuļa pogu parāda vai paslēpj spēles žurnālu un tērzēšanu.</p>
<h3>Gaišie un tumšie kauliņi</h3>
<p>Tavs kauliņš ir <b>tumšs</b>, ja tas atrodas joslā gar tavu apmali vai vidus aplī un tā caurumā vairs nav redzama līnija (2.13.). Pārējie tavi kauliņi ir <b>gaiši</b>. Ar ieslēgtiem padomiem <span class="legend dark"></span>iezīmē tavus tumšos kauliņus. Kauliņus tavā apmales zonā (arī pretinieka) ar tiešu sitienu nedrīkst skart pirmos (3.10.); ja tēmēšanas līnija ieslēgta, tā kļūst sarkana, kad vērsta uz tādu kauliņu.</p>
<h3>Pareizs sitiens</h3>
<p>Ripai vispirms jāskar savs gaišais kauliņš (2.8.3.). Pēc atsitiena no apmales tā drīkst vispirms skart jebkuru savu kauliņu (4.2.). Ja palikuši tikai tumšie kauliņi, sit ar atsitienu no pretējās apmales vai no sānu apmales pa savu kauliņu vidus aplī (2.8.4., 2.8.5.). Ar tiešu sitienu nekad nedrīkst vispirms skart kauliņu savā apmales zonā vai savu tumšo kauliņu vidus aplī (4.1.).</p>
<h3>Sitiena tiesības</h3>
<p>Ja iesit vismaz vienu savu kauliņu, sit vēlreiz (3.16.). Sitiena tiesības pāriet, ja neiesit nevienu savu, iesit pretinieka kauliņu (tas skaitās pretiniekam), kauliņš pārkrīt pāri apmalei vai ripa atpakaļgājienā pārslīd tavas zonas līniju, kad tev nav tumšo kauliņu (6.1.).</p>
<h3>Sodi</h3>
<p>Nepareizs pirmais pieskāriens, ripa maisiņā un citi pārkāpumi nozīmē sitiena tiesību zaudējumu un soda kauliņu: viens tavs iesistais kauliņš atgriežas uz viduslīnijas pie pretējās apmales (7.1., 7.3.). Ja visi astoņi vēl ir uz galda, sods kļūst par parādu, ko izliek, tiklīdz kāds kauliņš iesists (7.4.–7.6.). Ar sodāmu sitienu izkustinātos kauliņus var atjaunot (4.6., 4.8.). Ja ar tiešu sitienu skar kauliņu tumšajā laukumā un izkustas arī citi, sets ir zaudēts (8.1.4.).</p>
<h3>Seti</h3>
<p>Pēc katra seta spēlētāji mainās galda pusēm, un pirmā sitiena tiesības mainās (12.2.). Ja ar pirmo sitienu sēriju iesit visus astoņus, pretiniekam ir viena sērija atbildei; ja arī viņš iesit visus, setu pārspēlē, mainot puses un pirmā sitiena tiesības (12.4.). Ja vienā sitienā iekrīt abi pēdējie kauliņi, setu pārspēlē (12.5.).</p>
<h3>Par šo versiju</h3>
<p class="note">Atbilst LNF novusa noteikumiem, kas apstiprināti 2024. gada 9. martā ar 2025. gada 9. marta papildinājumiem, vienspēlei. Nav iekļauts: dubultspēles, 30 sekunžu laika limits, brīdinājumi, kauliņi uz sāniem vai uzkrituši cits uz cita. Kauliņš pārkrīt pāri apmalei tikai pēc ļoti spēcīga trieciena. Kur noteikumi atstāj vietu interpretācijai: ja pēdējais kauliņš iesists ar sitienu, pēc kura zūd sitiena tiesības, sets ir zaudēts (pēc 12.4. piezīmes); ja iesit pretinieka pēdējo kauliņu, sets pienākas pretiniekam. Tiešsaistes spēlē katru sitienu pārbauda un izspēlē serveris, tāpēc abi spēlētāji vienmēr redz vienu un to pašu galdu.</p>
<h3>Avoti</h3>
<ul class="sources">
<li><a href="https://novuss-lnf.lv/novusa-speles-noteikumi" target="_blank" rel="noopener">Latvijas Novusa federācija — Novusa spēles noteikumi</a> (<a href="https://novuss-lnf.lv/wp-content/uploads/2025/03/Novusa-noteikumi-papildinajums-9.03.2025.pdf" target="_blank" rel="noopener">PDF</a>): noteikumi un inventāra izmēri, pēc kuriem veidota šī spēle.</li>
<li><a href="https://novussusa.com/?p=24" target="_blank" rel="noopener">ASV Novusa asociācijas noteikumi</a> un <a href="https://latviansonline.com/novuss-a-guide-to-playing-the-game/" target="_blank" rel="noopener">„Novuss: A guide to playing the game”</a> (Latvians Online): izmantoti fonam; kur tie atšķiras, noteicošie ir LNF noteikumi.</li>
<li><a href="https://en.wikipedia.org/wiki/Novuss" target="_blank" rel="noopener">Novuss Vikipēdijā</a>: vispārīga informācija.</li>
</ul>
<h3 id="about">Par šo vietni</h3>
<p>Veidoja laacz — <a href="https://laacz.lv" target="_blank" rel="noopener">laacz.lv</a>, daļa no <a href="https://didnt.work" target="_blank" rel="noopener">didnt.work</a>. Atsauksmes gaidītas <a href="https://twitter.com/laacz" target="_blank" rel="noopener">Twitter (@laacz)</a> vai e-pastā <a href="mailto:laacz@laacz.lv?subject=Novuss">laacz@laacz.lv</a>.</p>`
  };

  /* ----------------------------------------------------------- settings */

  const store = {
    get(k, d) { try { const v = localStorage.getItem('novuss.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('novuss.' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };
  const settings = Object.assign({
    lang: 'lv',
    mode: 'ai', level: 'medium', sets: 2, names: ['', ''], hints: true, guide: false, log: true, sound: true
  }, store.get('settings', {}));
  if (!STR[settings.lang]) settings.lang = 'lv';
  // v2: the aim line became opt-in; earlier saves carry the old default.
  if (!(settings.v >= 2)) { settings.guide = false; settings.v = 2; }
  const save = () => store.set('settings', settings);

  // Seat tokens for online rooms, kept as long as the server keeps a room (3 days).
  const TOKEN_TTL = 3 * 24 * 3600 * 1000;
  function roomTokens() {
    const all = store.get('rooms', {}), now = Date.now(), keep = {};
    Object.keys(all)
      .filter(id => all[id] && now - all[id].at < TOKEN_TTL)
      .sort((a, b) => all[b].at - all[a].at)
      .slice(0, 30)
      .forEach(id => { keep[id] = all[id]; });
    return keep;
  }
  function saveToken(room, token) {
    const all = roomTokens();
    all[room] = { token, at: Date.now() };
    store.set('rooms', all);
  }
  const tokenFor = room => (roomTokens()[room] || {}).token || null;
  // Earlier versions kept one key per room; fold them into the map.
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (!k || k.indexOf('novuss.room.') !== 0) continue;
      const v = store.get(k.slice(7), null);
      if (v && v.token) saveToken(k.slice(12), v.token);
      localStorage.removeItem(k);
    }
  } catch (e) { /* storage unavailable */ }

  function t(key, params) {
    let s = STR[settings.lang][key];
    if (s == null) s = STR.en[key] || key;
    if (params) s = s.replace(/\{(\w+)\}/g, (m, k) => (params[k] != null ? params[k] : m));
    return s;
  }

  /* -------------------------------------------------------------- state */

  const canvas = $('#table'), ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, scale = 1, cx = 0, cy = 0;

  let game = null;            // the match in progress
  let backdrop = new N.Game(); // drawn behind the menu before the first match
  // place | moving | settle | ai | aiAnim | remote | sending | result | lobby | menu
  let phase = 'menu';
  let mode = 'ai', level = 'medium';  // of the match in progress
  let sim = null, striker = null, drag = null, aim = null, ai = null, aiAnim = null;
  let settleTimer = 0, names = ['', ''];
  let lastPlace = [null, null];
  let effects = [];
  const view = { rot: 0, target: 0 };
  let log = [];               // message codes of the match: game events and chat
  let logMode = 'side', sheetOpen = false;
  let dirty = true, lastPaint = 0, paints = 0;  // the table is redrawn only when needed

  // Online match: our seat (-1 watches), the server's sequence number, the shot being
  // replayed and any that arrive while it plays.
  const net = {
    room: null, seat: -1, token: null, seats: [null, null], seq: 0, match: null, joinReq: null,
    status: 'idle', pending: null, queue: [], sentAt: 0, aimAt: 0, aimDirty: false
  };
  const onlineAvailable = location.protocol === 'http:' || location.protocol === 'https:';

  // Helpers are fixed for a match: taken from the menu when it starts (online, the host's).
  let helpers = { guide: false, hints: true };
  const isAI = p => game && mode === 'ai' && p === 1;
  const isRemote = p => game && mode === 'online' && p !== net.seat;
  const nameOf = p => names[p];
  const human = () => game && !isAI(game.turn) && !isRemote(game.turn);
  const paused = () => document.querySelector('.overlay.open') !== null;

  /* ------------------------------------------------------------- layout */

  function layout() {
    invalidate();
    dpr = window.devicePixelRatio || 1;
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    // Pin the CSS size too: iOS Safari's 100vh is taller than the visible area while its
    // toolbars show, which stretched the drawing away from where touches were mapped.
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    const top = $('#hud').offsetHeight;
    const full = F + 2 * C.RAIL;
    const byHeight = (H - top - 8) / (full + 230);
    scale = Math.min((W - 16) / (full + 20), byHeight);
    // Portrait screens keep about 190 px under the table for the log.
    if (H - top > W * 1.1) scale = Math.min(scale, (H - top - 190) / full);
    cx = W / 2;
    cy = top + (H - top) / 2;
    // Near-square windows: give up a little table to keep the log docked on the left.
    const dockW = Math.min(340, Math.max(260, W * 0.26));
    const docked = Math.min((W - dockW - 40) / (full + 20), byHeight);
    if ((W - full * scale) / 2 < 250 && W >= 760 && docked >= scale * 0.75) {
      scale = docked;
      cx = dockW + 24 + (W - dockW - 24) / 2;
    }
    // Tall screens: table near the top, leaving room below for pulling back and messages.
    const spare = H - top - full * scale;
    if (spare >= 180) cy = top + 12 + full * scale / 2;
    // The log goes beside the table when there is room, below it on tall screens, and
    // otherwise opens as a sheet from the log button.
    const board = full * scale, side = cx - board / 2, below = H - (cy + board / 2);
    const P = $('#logpanel').style;
    P.left = P.right = P.top = P.bottom = P.width = P.height = '';
    if (side >= 250) {
      logMode = 'side';
      Object.assign(P, { left: '12px', top: top + 8 + 'px', bottom: '12px', width: Math.min(340, side - 28) + 'px' });
    } else if (below >= 150) {
      logMode = 'below';
      Object.assign(P, { left: '8px', right: '8px', top: Math.round(cy + board / 2 + 10) + 'px', bottom: '8px' });
    } else {
      logMode = 'sheet';
      Object.assign(P, { left: '8px', right: '8px', bottom: '8px', height: 'min(45vh, 360px)' });
    }
    syncLogPanel();
  }

  function toWorld(e) {
    const r = canvas.getBoundingClientRect();
    const dx = (e.clientX - r.left - cx) / scale, dy = (e.clientY - r.top - cy) / scale;
    const c = Math.cos(view.rot), s = Math.sin(view.rot);
    return [F / 2 + dx * c + dy * s, F / 2 - dx * s + dy * c];
  }

  const sideRot = side => (side === 'S' ? 0 : Math.PI);
  function viewFor(p) {
    if (mode === 'ai') return sideRot(game.sides[0]);
    if (mode === 'online') return sideRot(game.sides[Math.max(0, net.seat)]);
    return sideRot(game.sides[p]);
  }

  /* -------------------------------------------------------------- sound */

  let actx = null, noise = null;
  function ensureAudio() {
    if (actx || !settings.sound) return;
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      noise = actx.createBuffer(1, actx.sampleRate * 0.2, actx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { actx = null; }
  }
  function click(freq, q, dur, gain) {
    const now = actx.currentTime;
    const src = actx.createBufferSource(); src.buffer = noise;
    const f = actx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = actx.createGain();
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(f); f.connect(g); g.connect(actx.destination);
    src.start(now); src.stop(now + dur + 0.02);
  }
  function thump(gain) {
    const now = actx.currentTime;
    const o = actx.createOscillator(), g = actx.createGain();
    o.frequency.setValueAtTime(170, now); o.frequency.exponentialRampToValueAtTime(60, now + 0.14);
    g.gain.setValueAtTime(gain, now); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    o.connect(g); g.connect(actx.destination); o.start(now); o.stop(now + 0.18);
  }
  function sound(type, power) {
    if (!actx || !settings.sound) return;
    if (actx.state === 'suspended') actx.resume();
    if (type === 'hit') click(2300, 2.5, 0.03, Math.min(0.9, power / 3500));
    else if (type === 'cushion') click(650, 1.2, 0.05, Math.min(0.6, power / 4500));
    else if (type === 'pocket') { thump(0.4); click(300, 1, 0.08, 0.15); }
    else if (type === 'cue') click(3200, 3, 0.02, 0.25 + 0.4 * power);
    else if (type === 'off') click(900, 1, 0.12, 0.4);
  }

  /* ------------------------------------------------------------- HUD */

  function updateHud() {
    invalidate();
    const g = game || backdrop;
    $('#setinfo').textContent = game ? t('setInfo', { n: g.setNo, w: g.setsToWin }) : 'Novuss';
    for (let p = 0; p < 2; p++) {
      const el = $('#p' + p);
      let label = game ? nameOf(p) : (p ? t('p2') : t('p1'));
      if (game && mode === 'online') {
        if (p === net.seat) label += ' ' + t('you');
        else if (net.seats[p] && !net.seats[p].online) label += ' · ' + t('offline');
      }
      el.querySelector('.pname').textContent = label;
      el.classList.toggle('active', !!game && g.turn === p && phase !== 'result' && g.winner === null);
      const on = g.onTable(p);
      let pips = '';
      for (let i = 0; i < 8; i++) pips += `<span class="pip${i < on ? ' on' : ''}"></span>`;
      el.querySelector('.pips').innerHTML = pips;
      el.querySelector('.pips').title = t('onTable', { n: on });
      const sets = el.querySelector('.sets');
      sets.textContent = t('setsWon', { n: g.sets[p], w: g.setsToWin });
      sets.title = t('setsTitle');
      el.querySelector('.debt').textContent = g.debt[p] ? t('debtBadge', { n: g.debt[p] }) : '';
    }
    updateStatus();
    $('#btn-sound').classList.toggle('off', !settings.sound);
    $('#opt-guide').checked = settings.guide;
    $('#opt-hints').checked = settings.hints;
    syncLogPanel();
  }

  function updateStatus() {
    let s = '';
    if (mode === 'online' && net.status === 'lost') s = t('reconnecting');
    else if (game && game.winner === null) {
      const p = game.turn;
      if (phase === 'ai' || phase === 'aiAnim') s = t('thinking', { name: nameOf(p) });
      else if (phase === 'remote') {
        s = net.seats[p] && !net.seats[p].online ? t('oppOffline', { name: nameOf(p) }) : t('remoteTurn', { name: nameOf(p) });
        if (net.seat < 0) s = t('watching') + ' · ' + s;
      }
      else if (phase === 'place') {
        if (drag && drag.kind === 'aim' && aim && aim.dir) s = aim.valid ? t('power', { n: Math.round(aim.power * 100) }) : t('aimBad');
        else s = t('yourShot', { name: nameOf(p) }) + ' · ' + t('placeHint');
      }
    }
    const el = $('#status');
    if (el.textContent !== s) el.textContent = s;
  }

  function toast(text, kind) {
    const box = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast' + (kind ? ' ' + kind : '');
    el.textContent = text;
    box.appendChild(el);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(() => el.classList.add('gone'), 5200);
    setTimeout(() => el.remove(), 5800);
  }

  /* ------------------------------------------------------- log & chat */

  function setResultText(res, shooter, set) {
    if (res.replay) return t('replayTitle') + ' — ' + t(res.k);
    const lost = res.k.indexOf('lost_') === 0;
    const why = lost ? nameOf(shooter) + ': ' + t(res.k) : t(res.k, { name: nameOf(res.winner) });
    return t('setWon', { name: nameOf(res.winner), n: set }) + ' — ' + why;
  }

  function logItem(e) {
    const li = document.createElement('li');
    if (e.k === 'chat') {
      li.className = 'chat s' + e.seat;
      const who = document.createElement('span');
      who.className = 'who';
      who.textContent = e.seat >= 0 ? (e.name || seatName(e.seat)) : (e.name || t('spectator'));
      li.append(who, document.createTextNode(e.text));
      return li;
    }
    if (e.k === 'set') { li.className = 'set'; li.textContent = setResultText(e.res, e.shooter, e.set); return li; }
    if (e.k === 'matchWon') { li.className = 'set'; li.textContent = t('matchWon', { name: nameOf(e.who) }); return li; }
    if (e.k === 'coin') { li.className = 'info'; li.textContent = t('coin', { name: nameOf(e.who) }); return li; }
    li.className = e.k.indexOf('pen_') === 0 ? 'bad' : e.k === 'pocketed' ? 'good' : 'info';
    const text = t(e.k, { n: e.n, name: nameOf(e.who) });
    if (e.k === 'firstClear') li.textContent = text;
    else {
      const b = document.createElement('b');
      b.textContent = nameOf(e.who) + ': ';
      li.append(b, document.createTextNode(text));
    }
    return li;
  }

  let logSet = null;
  function appendLogItems(entries, fresh) {
    const box = $('#log');
    const atEnd = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
    for (const e of entries) {
      // A divider whenever a new set (or a new match) starts.
      if (e.k === 'coin' || (e.k !== 'chat' && e.set && e.set !== logSet)) {
        logSet = e.set || 1;
        const sep = document.createElement('li');
        sep.className = 'sep';
        sep.textContent = t('setHeader', { n: logSet });
        box.appendChild(sep);
      }
      const li = logItem(e);
      if (fresh) li.classList.add('new');
      box.appendChild(li);
    }
    if (atEnd || fresh) box.scrollTop = box.scrollHeight;
  }

  function renderLog() {
    $('#log').innerHTML = '';
    logSet = null;
    appendLogItems(log, false);
    $('#log').scrollTop = $('#log').scrollHeight;
  }

  function addLog(entries) {
    if (!entries || !entries.length) return;
    log.push(...entries);
    if (log.length > LOG_KEEP) { log.splice(0, log.length - LOG_KEEP); renderLog(); } else appendLogItems(entries, true);
    if (!logVisible() && entries.some(e => e.k === 'chat')) $('#btn-log').classList.add('unread');
  }

  const logVisible = () => (logMode === 'sheet' ? sheetOpen : settings.log);

  function syncLogPanel() {
    const show = !!game || (mode === 'online' && net.room);
    $('#logpanel').classList.toggle('show', show && logVisible());
    $('#chat').classList.toggle('show', mode === 'online' && !!game);
    $('#btn-log').classList.toggle('off', !logVisible());
    if (logVisible()) $('#btn-log').classList.remove('unread');
  }

  function banner(text) {
    const el = $('#banner');
    el.textContent = text;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  /* ------------------------------------------------------------- flow */

  function startMatch() {
    readNames();
    leaveRoom();
    if (settings.mode === 'online') { startOnline(); return; }
    const first = Math.random() < 0.5 ? 0 : 1;
    game = new N.Game({ setsToWin: +settings.sets, first });
    mode = settings.mode;
    level = settings.level;
    names = [settings.names[0] || t('p1'), mode === 'ai' ? t('computer') : (settings.names[1] || t('p2'))];
    helpers = { guide: settings.guide, hints: settings.hints };
    lastPlace = [null, null];
    effects = [];
    sim = null;
    $('#toasts').innerHTML = '';
    closeOverlays();
    view.target = viewFor(first);
    view.rot = view.target;
    log = [{ k: 'coin', who: first, set: 1 }];
    renderLog();
    syncLogPanel();
    beginTurn(true);
  }

  function beginTurn(fresh) {
    const p = game.turn, side = game.sides[p];
    view.target = viewFor(p);
    let s = null;
    const pref = lastPlace[p];
    if (pref) {
      const a = N.flip(side, pref[0], pref[1]);
      s = game.canPlace(p, a[0], a[1]) ? a : game.defaultPlace(p, pref[0]);
    } else s = game.defaultPlace(p);
    if (!s) s = game.slidePlace(p, ...N.flip(side, F / 2, 945)) || N.flip(side, F / 2, 945);
    striker = { x: s[0], y: s[1] };
    drag = null; aim = null; aiAnim = null;
    if (!fresh && mode !== 'ai') banner(t('turnOf', { name: nameOf(p) }));
    if (isAI(p)) {
      phase = 'ai';
      ai = { gen: N.planShot(game.clone(), level), t: 0, shot: null };
    } else if (isRemote(p)) {
      phase = 'remote';
    } else {
      phase = 'place';
      sendAim(true);
    }
    updateHud();
  }

  function fire(x, y, vx, vy) {
    const p = game.turn, speed = Math.hypot(vx, vy);
    lastPlace[p] = N.flip(game.sides[p], x, y);
    sound('cue', speed / C.MAX_SPEED);
    drag = null; aiAnim = null;
    if (mode === 'online') {
      // The server judges the shot; it comes back as a 'shot' message for everyone.
      link.send({ t: 'shot', x, y, vx, vy, seq: net.seq });
      aim = { dir: [vx / speed, vy / speed], power: 0, shown: 0, valid: true };
      phase = 'sending';
      net.sentAt = performance.now();
      updateHud();
      return;
    }
    sim = game.shoot(x, y, vx, vy);
    sim.events = [];
    striker = null; aim = null;
    phase = 'moving';
    updateHud();
  }

  // Replay a shot the server has judged, starting from the position it was played in.
  function playShot(ev) {
    game = N.Game.fromJSON(ev.pre);
    net.seq = ev.seq;
    net.pending = ev;
    closeOverlay('#result');
    sim = game.shoot(ev.shot.x, ev.shot.y, ev.shot.vx, ev.shot.vy);
    sim.events = [];
    striker = null; aim = null; drag = null;
    phase = 'moving';
    // Hidden tabs do not animate, and a backlog is not worth watching shot by shot.
    if (document.hidden || net.queue.length) { skipShot(); return; }
    if (ev.seat !== net.seat) sound('cue', Math.hypot(ev.shot.vx, ev.shot.vy) / C.MAX_SPEED);
    updateHud();
  }

  // Jump to the end of the shot being played.
  function skipShot() {
    if (!sim || (phase !== 'moving' && phase !== 'settle')) return;
    sim.run();
    sim.events = [];
    finishShot();
  }

  function finishShot() {
    const prev = game.turn;
    let out, next = null, entries;
    if (net.pending) {
      const ev = net.pending;
      net.pending = null;
      // How far the local replay ended from the server's result (0 when the engines agree).
      // Pieces the rules moved afterwards (restored, from off the table) are not physics.
      net.drift = 0;
      const ruled = new Set(ev.out.marks.map(mk => mk.id));
      for (const b of sim.bodies) {
        const k = !b.striker && !ruled.has(b.id) && ev.post.pucks[b.id];
        if (k && k.on && b.on) net.drift = Math.max(net.drift, Math.hypot(b.x - k.x, b.y - k.y));
      }
      game = N.Game.fromJSON(ev.post);
      out = ev.out;
      next = ev.next;
      entries = ev.log;
    } else {
      out = game.resolve(sim);
      entries = N.logEntries(out, game.setNo);
    }
    sim = null;
    addLog(entries);
    for (const mk of out.marks) effects.push({ kind: 'pulse', id: mk.id, t: 0, dur: 1.8 });
    if (out.setResult) {
      phase = 'result';
      updateHud();
      const g = game;
      setTimeout(() => { if (game === g) showResult(out.setResult, out.shooter, next); }, 900);
      drainNet();
      return;
    }
    beginTurn(game.turn === prev);
    drainNet();
  }

  function showResult(res, shooter, next) {
    const setNo = game.setNo;
    let title, text = '';
    if (res.replay) {
      title = t('replayTitle');
      text = t(res.k);
    } else {
      const w = res.winner;
      text = t(res.k, { name: nameOf(res.k.indexOf('lost_') === 0 ? 1 - shooter : w) });
      if (res.k.indexOf('lost_') === 0) text = nameOf(shooter) + ': ' + text;
      title = t('setWon', { name: nameOf(w), n: setNo });
    }
    if (next) game = N.Game.fromJSON(next);
    else {
      game.nextSet(res);
      if (game.winner !== null) addLog([{ k: 'matchWon', who: game.winner, set: setNo }]);
    }
    lastPlace = [null, null];
    if (game.winner !== null) title = t('matchWon', { name: nameOf(game.winner) });
    $('#result-title').textContent = title;
    $('#result-score').textContent = `${game.sets[0]} : ${game.sets[1]}`;
    $('#result-text').textContent = text;
    const over = game.winner !== null;
    $('#btn-result').textContent = over ? (mode === 'online' ? t('rematch') : t('newMatch')) : res.replay ? t('cont') : t('nextSet');
    $('#btn-result').style.display = over && mode === 'online' && net.seat < 0 ? 'none' : '';
    open('#result');
    updateHud();
  }

  $('#btn-result').addEventListener('click', () => {
    closeOverlays();
    if (game.winner !== null) {
      if (mode === 'online') { link.send({ t: 'rematch' }); return; }
      openMenu();
      return;
    }
    effects = [];
    $('#toasts').innerHTML = '';
    beginTurn(true);
    if (mode !== 'ai' || !isAI(game.turn)) banner(t('turnOf', { name: nameOf(game.turn) }));
  });

  /* ------------------------------------------------------------ online */

  const link = {
    ws: null, want: false, retry: 0, timer: null, ping: null, onOpen: null,
    open(onOpen) {
      this.close();
      this.want = true;
      this.onOpen = onOpen;
      this.connect();
    },
    connect() {
      clearTimeout(this.timer);
      let ws;
      // Each room is its own Durable Object, so the room is part of the address.
      const url = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws?room=' + (net.room || 'new');
      try { ws = new WebSocket(url); } catch (e) { this.later(); return; }
      this.ws = ws;
      ws.onopen = () => {
        this.retry = 0;
        this.rx = Date.now();
        net.status = 'open';
        clearInterval(this.ping);
        // The server answers every ping; a minute of silence means the connection died
        // without telling us (sleep, network change), so start a new one.
        this.ping = setInterval(() => {
          if (Date.now() - this.rx > 65000) { this.drop(ws); return; }
          this.send({ t: 'ping' });
        }, 25000);
        if (this.onOpen) this.onOpen();
        updateStatus();
      };
      ws.onmessage = e => {
        this.rx = Date.now();
        let m;
        try { m = JSON.parse(e.data); } catch (x) { return; }
        onNet(m);
      };
      ws.onclose = () => this.drop(ws);
    },
    // Forget a socket that closed or went silent, and schedule a reconnect.
    drop(ws) {
      if (this.ws !== ws) return;
      clearInterval(this.ping);
      this.ws = null;
      ws.onclose = ws.onmessage = ws.onopen = null;
      try { ws.close(); } catch (e) { /* already closed */ }
      if (!this.want) return;
      if (net.status !== 'lost' && this.retry === 0) toast(t(net.status === 'open' ? 'reconnecting' : 'serverDown'), 'bad');
      net.status = 'lost';
      updateStatus();
      this.later();
    },
    // Back online or back in view: retry now instead of waiting out the backoff.
    wake() {
      if (!this.want || (this.ws && this.ws.readyState <= 1)) return;
      clearTimeout(this.timer);
      this.retry = 0;
      this.connect();
    },
    later() {
      this.retry++;
      this.timer = setTimeout(() => this.connect(), Math.min(10000, 500 * Math.pow(2, Math.min(this.retry, 5))));
    },
    send(m) {
      if (this.ws && this.ws.readyState === 1) { this.ws.send(JSON.stringify(m)); return true; }
      return false;
    },
    close() {
      this.want = false;
      clearTimeout(this.timer);
      clearInterval(this.ping);
      if (this.ws) { const w = this.ws; this.ws = null; w.close(); }
    }
  };

  const shareUrl = room => location.origin + location.pathname + '?room=' + room;

  function leaveRoom() {
    if (!net.room && !link.want) return;
    link.close();
    Object.assign(net, { room: null, seat: -1, token: null, seats: [null, null], seq: 0, match: null, joinReq: null, status: 'idle', pending: null, queue: [] });
    if (location.search) history.replaceState(null, '', location.pathname);
  }

  function startOnline() {
    mode = 'online';
    game = null;
    phase = 'lobby';
    showLobby();
    link.open(() => {
      if (net.joinReq) link.send(net.joinReq);
      else link.send({ t: 'create', name: settings.names[0], sets: +settings.sets, guide: settings.guide, hints: settings.hints });
    });
  }

  // Opened from a shared link.
  function openJoin(room) {
    mode = 'online';
    net.room = room;
    const saved = tokenFor(room);
    if (saved) {
      net.joinReq = { t: 'join', room, token: saved };
      phase = 'lobby';
      showLobby();
      link.open(() => link.send(net.joinReq));
      return;
    }
    $('#join-name').value = settings.names[0] || '';
    $('#join-text').textContent = t('connecting');
    $('#join-error').textContent = '';
    $('#btn-join').disabled = true;
    $('#btn-watch').style.display = 'none';
    open('#join');
    link.open(() => (net.joinReq ? link.send(net.joinReq) : link.send({ t: 'peek', room })));
  }

  function sendJoin(watch) {
    const name = $('#join-name').value.trim();
    settings.names[0] = name;
    save();
    net.joinReq = { t: 'join', room: net.room, name, watch: !!watch };
    link.send(net.joinReq);
  }

  function showLobby() {
    closeOverlays();
    const url = net.room ? shareUrl(net.room) : '';
    $('#lobby-link').value = url;
    $('#lobby-copy').disabled = !url;
    $('#lobby-share').style.display = url && navigator.share ? '' : 'none';
    $('#lobby-invite').style.display = net.seat === 0 || !net.room ? '' : 'none';
    $('#lobby-status').textContent = !net.room ? t('connecting') : net.seat === 0 ? t('waiting') : t('connecting');
    open('#lobby');
    updateHud();
  }

  function seatName(i) {
    const s = net.seats[i];
    return (s && s.name) || t(i ? 'p2' : 'p1');
  }

  function applyState(m) {
    net.room = m.room;
    net.seats = m.seats;
    helpers = { guide: !!m.guide, hints: !!m.hints };
    net.seq = m.seq;
    names = [seatName(0), seatName(1)];
    // Only a freshly joined connection gets the whole log; later states keep ours.
    if (m.log) {
      log = m.log;
      renderLog();
    }
    if (!m.game) {
      game = null;
      phase = 'lobby';
      showLobby();
      syncLogPanel();
      return;
    }
    const fresh = net.match !== m.match;
    net.match = m.match;
    game = N.Game.fromJSON(m.game);
    mode = 'online';
    sim = null;
    net.pending = null;
    net.queue = [];
    effects = [];
    ['#lobby', '#join', '#result'].forEach(closeOverlay);
    if (fresh) {
      $('#toasts').innerHTML = '';
      lastPlace = [null, null];
      view.rot = view.target = viewFor(game.turn);
    }
    syncLogPanel();
    if (game.winner !== null) {
      // Rejoined after the last set: offer the rematch straight away.
      phase = 'result';
      $('#result-title').textContent = t('matchWon', { name: nameOf(game.winner) });
      $('#result-score').textContent = `${game.sets[0]} : ${game.sets[1]}`;
      $('#result-text').textContent = '';
      $('#btn-result').textContent = t('rematch');
      $('#btn-result').style.display = net.seat < 0 ? 'none' : '';
      open('#result');
      updateHud();
      return;
    }
    beginTurn(true);
  }

  // Messages are handled in order; a shot waits while the previous one is still playing.
  function onNet(m) {
    if (m.v && window.NOVUSS_BUILD && m.v !== window.NOVUSS_BUILD) planReload(m.v);
    if (m.t === 'shot' || m.t === 'state') {
      net.queue.push(m);
      drainNet();
      return;
    }
    if (m.t === 'joined') {
      net.room = m.room;
      net.seat = m.seat;
      net.token = m.token;
      if (m.token) {
        saveToken(m.room, m.token);
        net.joinReq = { t: 'join', room: m.room, token: m.token };
      } else net.joinReq = { t: 'join', room: m.room, watch: true };
      if (location.search !== '?room=' + m.room) history.replaceState(null, '', '?room=' + m.room);
    } else if (m.t === 'peek') {
      if (m.missing) { joinError(); return; }
      const host = m.seats[0] && m.seats[0].name;
      const full = !!m.seats[1];
      const on = [m.guide && t('guide'), m.hints && t('hints')].filter(Boolean).join(', ') || t('none');
      $('#join-text').textContent = (full ? t('full') : host ? t('joinHost', { name: host }) : t('joinAnon')) + ' ' + t('helpersIn', { list: on.toLowerCase() });
      $('#btn-join').disabled = full;
      $('#btn-join').style.display = full ? 'none' : '';
      $('#btn-watch').style.display = full ? '' : 'none';
    } else if (m.t === 'log') {
      addLog(m.entries);
    } else if (m.t === 'presence') {
      net.seats = m.seats;
      updateHud();
    } else if (m.t === 'aim') {
      if (phase === 'remote' && m.seat === game.turn && m.seq === net.seq) {
        striker = { x: m.x, y: m.y };
        aim = m.dir ? { dir: m.dir, power: m.power, shown: m.power, valid: m.valid !== false } : null;
        invalidate();
      }
    } else if (m.t === 'error') {
      if (m.code === 'no_room') { joinError(); return; }
      if (m.code === 'stale' || m.code === 'bad_shot' || m.code === 'not_your_turn' || m.code === 'no_game') {
        toast(t('netError'), 'bad');
        link.send({ t: 'sync' });
      }
    }
  }

  // The server runs a newer build than this page (a deploy happened while it was open):
  // reload at the next quiet moment; the seat token brings the player straight back.
  // Only once per build, so a stale cache cannot cause a reload loop.
  function planReload(v) {
    try {
      if (sessionStorage.getItem('novuss.reloadedFor') === v) return;
      sessionStorage.setItem('novuss.reloadedFor', v);
    } catch (e) { return; }   // without storage there is no loop guard, so stay put
    net.reloadFor = v;
    toast(t('updating'));
  }

  function drainNet() {
    while (net.queue.length && phase !== 'moving' && phase !== 'settle') {
      const m = net.queue.shift();
      if (m.t === 'state') applyState(m);
      else if (m.seq > net.seq || phase === 'sending') playShot(m);
    }
  }

  function joinError() {
    link.close();
    closeOverlays();
    $('#join-text').textContent = '';
    $('#join-error').textContent = t('noRoom');
    $('#btn-join').style.display = 'none';
    $('#btn-watch').style.display = 'none';
    open('#join');
  }

  // Let the opponent see the striker and cue move, a few times a second.
  function sendAim(force) {
    if (mode !== 'online' || phase !== 'place' || !striker) return;
    const now = performance.now();
    if (!force && now - net.aimAt < 70) { net.aimDirty = true; return; }
    net.aimAt = now;
    net.aimDirty = false;
    const a = drag && drag.kind === 'aim' && aim && aim.dir ? aim : null;
    link.send({ t: 'aim', x: striker.x, y: striker.y, dir: a ? a.dir : null, power: a ? a.power : 0, valid: a ? a.valid : true });
  }

  /* ------------------------------------------------------- computer */

  function pumpAI(dt) {
    ai.t += dt;
    if (!ai.shot) {
      const t0 = performance.now();
      while (performance.now() - t0 < 9) {
        const r = ai.gen.next();
        if (r.done) { ai.shot = r.value; break; }
      }
    }
    if (ai.shot && ai.t > 0.5) {
      const s = ai.shot, speed = Math.hypot(s.vx, s.vy);
      aiAnim = { from: { x: striker.x, y: striker.y }, to: { x: s.x, y: s.y }, dir: [s.vx / speed, s.vy / speed], power: N.speedToPower(speed), shot: s, t: 0 };
      phase = 'aiAnim';
    }
  }

  function stepAIAnim(dt) {
    const a = aiAnim;
    a.t += dt;
    const ease = x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    const m = ease(clamp(a.t / 0.6, 0, 1));
    striker.x = a.from.x + (a.to.x - a.from.x) * m;
    striker.y = a.from.y + (a.to.y - a.from.y) * m;
    if (a.t > 0.6) {
      const pull = a.t < 1.5 ? ease(clamp((a.t - 0.7) / 0.7, 0, 1)) : clamp(1 - (a.t - 1.5) / 0.08, 0, 1);
      aim = { dir: a.dir, power: a.power, shown: a.power * pull, valid: true };
    }
    if (a.t >= 1.58) fire(a.shot.x, a.shot.y, a.shot.vx, a.shot.vy);
  }

  /* ------------------------------------------------------------- input */

  function updateAim(w, fine) {
    if (fine) {
      if (!aim.anchor) aim.anchor = { wx: w[0], wy: w[1], px: aim.px, py: aim.py };
      aim.px = aim.anchor.px + (w[0] - aim.anchor.wx) * 0.2;
      aim.py = aim.anchor.py + (w[1] - aim.anchor.wy) * 0.2;
      aim.off = [aim.px - w[0], aim.py - w[1]];
    } else {
      aim.anchor = null;
      aim.px = w[0] + aim.off[0];
      aim.py = w[1] + aim.off[1];
    }
    const dx = striker.x - aim.px, dy = striker.y - aim.py, d = Math.hypot(dx, dy);
    if (d < 1) { aim.dir = null; aim.power = 0; aim.valid = false; return; }
    aim.dir = [dx / d, dy / d];
    aim.power = clamp((d - C.STRIKER_R - 8) / MAX_PULL, 0, 1);
    aim.shown = aim.power;
    aim.valid = game.canAim(game.turn, striker.x, striker.y, aim.dir[0], aim.dir[1]);
  }

  // Pressing on the striker moves it; pressing anywhere else starts the pull-back.
  // A fingertip is far less precise than a mouse, and on a phone the striker is only ~15 px wide.
  const grabRadius = e => C.STRIKER_R + Math.max(2, (e.pointerType === 'mouse' ? 6 : 20) / scale);
  const canControl = () => game && phase === 'place' && human() && striker && !paused();

  canvas.addEventListener('pointerdown', e => {
    invalidate();
    ensureAudio();
    if (!canControl() || drag) return;
    if (e.button !== undefined && e.button !== 0) return;
    const w = toWorld(e);
    canvas.setPointerCapture(e.pointerId);
    const grab = grabRadius(e);
    if (Math.hypot(w[0] - striker.x, w[1] - striker.y) <= grab) {
      drag = { kind: 'place', id: e.pointerId, dx: striker.x - w[0], dy: striker.y - w[1] };
      canvas.style.cursor = 'grabbing';
    } else {
      drag = { kind: 'aim', id: e.pointerId };
      aim = { px: w[0], py: w[1], off: [0, 0], anchor: null };
      updateAim(w, e.shiftKey);
    }
    updateStatus();
    e.preventDefault();
  });

  canvas.addEventListener('pointermove', e => {
    if (drag) invalidate();
    if (!drag || drag.id !== e.pointerId) {
      if (canControl()) {
        const w = toWorld(e);
        canvas.style.cursor = Math.hypot(w[0] - striker.x, w[1] - striker.y) <= grabRadius(e) ? 'grab' : 'crosshair';
      } else canvas.style.cursor = 'default';
      return;
    }
    const w = toWorld(e);
    if (drag.kind === 'place') {
      const s = game.slidePlace(game.turn, w[0] + drag.dx, w[1] + drag.dy);
      if (s) { striker.x = s[0]; striker.y = s[1]; }
    } else updateAim(w, e.shiftKey);
    updateStatus();
    sendAim();
  });

  function endDrag(e, cancel) {
    invalidate();
    if (!drag || drag.id !== e.pointerId) return;
    const d = drag;
    drag = null;
    canvas.style.cursor = 'crosshair';
    if (d.kind === 'aim') {
      const a = aim;
      aim = null;
      if (!cancel && a && a.dir && a.power >= 0.02) {
        if (!a.valid) toast(t('invalidAim'), 'bad');
        else {
          const v = N.powerToSpeed(a.power);
          fire(striker.x, striker.y, a.dir[0] * v, a.dir[1] * v);
          return;
        }
      }
    }
    updateStatus();
    sendAim(true);
  }
  canvas.addEventListener('pointerup', e => endDrag(e, false));
  canvas.addEventListener('pointercancel', e => endDrag(e, true));
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  window.addEventListener('keydown', e => {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;   // typing, not playing
    if (e.key === 'Escape') {
      if (document.querySelector('.overlay.open')) {
        if ($('#rules').classList.contains('open')) { close('#rules'); return; }
        if ($('#menu').classList.contains('open') && game && game.winner === null) { closeOverlays(); return; }
        return;
      }
      if (drag && drag.kind === 'aim') { drag = null; aim = null; updateStatus(); sendAim(true); }
      return;
    }
    if (!canControl() || drag) return;
    const keys = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const k = keys[e.key];
    if (!k) return;
    e.preventDefault();
    const step = e.shiftKey ? 10 : 1, c = Math.cos(view.rot), s = Math.sin(view.rot);
    const dx = (k[0] * c + k[1] * s) * step, dy = (-k[0] * s + k[1] * c) * step;
    const p = game.slidePlace(game.turn, striker.x + dx, striker.y + dy);
    if (p) { striker.x = p[0]; striker.y = p[1]; }
    invalidate();
    sendAim();
  });

  /* ------------------------------------------------------------ drawing */

  let grain = null;
  function grainPattern() {
    if (grain) return grain;
    const c = document.createElement('canvas');
    c.width = 512; c.height = 512;
    const g = c.getContext('2d');
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 260; i++) {
      const x = rnd() * 512, w = 0.5 + rnd() * 2.5;
      g.fillStyle = `rgba(120, 80, 30, ${0.015 + rnd() * 0.035})`;
      g.beginPath();
      g.moveTo(x, 0);
      g.bezierCurveTo(x + (rnd() - 0.5) * 30, 170, x + (rnd() - 0.5) * 30, 340, x, 512);
      g.lineTo(x + w, 512);
      g.bezierCurveTo(x + w + (rnd() - 0.5) * 30, 340, x + w + (rnd() - 0.5) * 30, 170, x + w, 0);
      g.fill();
    }
    grain = ctx.createPattern(c, 'repeat');
    return grain;
  }

  function line(x1, y1, x2, y2) { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); }

  function drawTable() {
    const R = C.RAIL, Z = C.ZONE, M = F / 2;
    // Frame with shadow.
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 36;
    ctx.shadowOffsetY = 14;
    ctx.fillStyle = '#4a2b14';
    roundRect(-R, -R, F + 2 * R, F + 2 * R, 10);
    ctx.fill();
    ctx.restore();
    const rail = ctx.createLinearGradient(-R, -R, F + R, F + R);
    rail.addColorStop(0, '#7b4b26'); rail.addColorStop(0.5, '#6a3e1d'); rail.addColorStop(1, '#5b3318');
    ctx.fillStyle = rail;
    roundRect(-R, -R, F + 2 * R, F + 2 * R, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 220, 170, 0.18)';
    ctx.lineWidth = 2;
    roundRect(-R + 2, -R + 2, F + 2 * R - 4, F + 2 * R - 4, 9);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    line(-R, -R, 0, 0); line(F + R, -R, F, 0); line(-R, F + R, 0, F); line(F + R, F + R, F, F);
    ctx.stroke();

    // Playing surface.
    const surf = ctx.createRadialGradient(M, M * 0.9, 80, M, M, F * 0.75);
    surf.addColorStop(0, '#f3e3bf'); surf.addColorStop(1, '#dcc497');
    ctx.fillStyle = surf;
    ctx.fillRect(0, 0, F, F);
    ctx.fillStyle = grainPattern();
    ctx.fillRect(0, 0, F, F);
    // Inner shadow along the cushions.
    for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [[0, 0, 0, 14, 0, 0, F, 14], [0, F, 0, F - 14, 0, F - 14, F, 14], [0, 0, 14, 0, 0, 0, 14, F], [F, 0, F - 14, 0, F - 14, 0, 14, F]]) {
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, 'rgba(60,35,10,0.28)'); g.addColorStop(1, 'rgba(60,35,10,0)');
      ctx.fillStyle = g;
      ctx.fillRect(rx, ry, rw, rh);
    }

    // Lines (item 10–12).
    ctx.strokeStyle = '#1d140c';
    ctx.lineWidth = Math.max(C.LINE_W, 0.9 / scale);
    ctx.beginPath();
    line(Z, 0, Z, F); line(F - Z, 0, F - Z, F); line(0, Z, F, Z); line(0, F - Z, F, F - Z);
    line(M, 0, M, Z); line(M, F - Z, M, F); line(0, M, Z, M); line(F - Z, M, F, M);
    line(M - C.CIRCLE_R, M, M + C.CIRCLE_R, M); line(M, M - C.CIRCLE_R, M, M + C.CIRCLE_R);
    ctx.moveTo(M + C.CIRCLE_R, M);
    ctx.arc(M, M, C.CIRCLE_R, 0, Math.PI * 2);
    ctx.stroke();

    // Pockets.
    for (const [px, py] of N.POCKETS) {
      const g = ctx.createRadialGradient(px, py, 5, px, py, C.POCKET_R);
      g.addColorStop(0, '#050302'); g.addColorStop(0.75, '#140c06'); g.addColorStop(1, '#2d1d10');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(px, py, C.POCKET_R, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255, 240, 210, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(px, py, C.POCKET_R - 0.6, Math.PI * 0.75, Math.PI * 1.75); ctx.stroke();
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function ring(x, y, r, hole) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.moveTo(x + hole, y);
    ctx.arc(x, y, hole, 0, Math.PI * 2, true);
  }

  // Light comes from the top of the screen whichever way the table is turned.
  function lightDir() { return [Math.sin(view.rot), -Math.cos(view.rot)]; }

  function drawDisc(x, y, r, hole, kind, alpha, scaleR) {
    const rr = r * (scaleR || 1), hh = hole * (scaleR || 1);
    const L = lightDir();
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    // shadow
    ctx.fillStyle = 'rgba(40, 22, 6, 0.32)';
    ring(x - L[0] * 2.2, y - L[1] * 2.2 + 0, rr + 0.6, hh);
    ctx.fill('evenodd');
    const hx = x + L[0] * rr * 0.4, hy = y + L[1] * rr * 0.4;
    const g = ctx.createRadialGradient(hx, hy, rr * 0.1, x, y, rr);
    if (kind === 0) { g.addColorStop(0, '#ec5c62'); g.addColorStop(0.55, '#c3282f'); g.addColorStop(1, '#7c1217'); }
    else if (kind === 1) { g.addColorStop(0, '#5c5c5c'); g.addColorStop(0.55, '#262626'); g.addColorStop(1, '#0b0b0b'); }
    else { g.addColorStop(0, '#fbedcf'); g.addColorStop(0.6, '#e6cb93'); g.addColorStop(1, '#b38750'); }
    ctx.fillStyle = g;
    ring(x, y, rr, hh);
    ctx.fill('evenodd');
    // slightly concave face and the rounded edge
    ctx.lineWidth = Math.max(0.6, rr * 0.06);
    ctx.strokeStyle = kind === 2 ? 'rgba(110, 70, 30, 0.55)' : 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.arc(x, y, rr - ctx.lineWidth / 2, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = kind === 2 ? 'rgba(120, 80, 35, 0.35)' : 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.arc(x, y, rr * 0.62, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = Math.max(0.5, rr * 0.05);
    ctx.beginPath(); ctx.arc(x, y, hh, 0, Math.PI * 2); ctx.stroke();
    if (kind === 2) {
      ctx.strokeStyle = 'rgba(150, 100, 45, 0.25)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      for (let i = -2; i <= 2; i++) { ctx.moveTo(x - rr * 0.8, y + i * rr * 0.28); ctx.quadraticCurveTo(x, y + i * rr * 0.28 + rr * 0.08, x + rr * 0.8, y + i * rr * 0.28); }
      ctx.stroke();
    }
    ctx.restore();
  }

  function dashedRing(x, y, r, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.3, 1.6 / scale);
    ctx.setLineDash([4, 3.2]);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  function castRay(sx, sy, dx, dy) {
    const R = C.STRIKER_R + C.PUCK_R, r = C.STRIKER_R;
    let best = Infinity, hit = null;
    for (const k of game.pucks) {
      if (!k.on) continue;
      const fx = k.x - sx, fy = k.y - sy, tp = fx * dx + fy * dy;
      if (tp <= 0) continue;
      const perp2 = fx * fx + fy * fy - tp * tp;
      if (perp2 > R * R) continue;
      const tt = tp - Math.sqrt(R * R - perp2);
      if (tt >= 0 && tt < best) { best = tt; hit = k; }
    }
    const tx = dx < 0 ? (r - sx) / dx : dx > 0 ? (F - r - sx) / dx : Infinity;
    const ty = dy < 0 ? (r - sy) / dy : dy > 0 ? (F - r - sy) / dy : Infinity;
    const tw = Math.min(tx, ty);
    if (tw < best) { best = tw; hit = null; }
    return { t: best, puck: hit };
  }

  function drawAim() {
    if (!aim || !aim.dir || !striker) return;
    const [dx, dy] = aim.dir, p = game.turn;
    if (helpers.guide && phase === 'place') {
      const hit = castRay(striker.x, striker.y, dx, dy);
      const gx = striker.x + dx * hit.t, gy = striker.y + dy * hit.t;
      let color = 'rgba(255, 252, 240, 0.85)';
      if (hit.puck) {
        const k = hit.puck;
        const ok = k.owner === p && !game.isDark(k) && !game.inOwnStrip(p, k);
        color = ok ? '#2f8f5b' : '#c8372f';
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, F, F);
      ctx.clip();
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, 1.3 / scale);
      ctx.setLineDash([7, 6]);
      ctx.beginPath(); ctx.moveTo(striker.x + dx * C.STRIKER_R, striker.y + dy * C.STRIKER_R); ctx.lineTo(gx, gy); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.arc(gx, gy, C.STRIKER_R, 0, Math.PI * 2); ctx.stroke();
      if (hit.puck) {
        const nx = hit.puck.x - gx, ny = hit.puck.y - gy, nl = Math.hypot(nx, ny);
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = Math.max(1.2, 1.6 / scale);
        ctx.beginPath(); ctx.moveTo(hit.puck.x, hit.puck.y); ctx.lineTo(hit.puck.x + nx / nl * 130, hit.puck.y + ny / nl * 130); ctx.stroke();
      }
      ctx.restore();
    }

    // The cue: 8 mm tip (item 25), tapering out towards the butt.
    const pull = 5 + (aim.shown != null ? aim.shown : aim.power) * 110;
    const tipX = striker.x - dx * (C.STRIKER_R + pull), tipY = striker.y - dy * (C.STRIKER_R + pull);
    const len = 1100, buttX = tipX - dx * len, buttY = tipY - dy * len;
    const nx = -dy, ny = dx;
    const g = ctx.createLinearGradient(tipX, tipY, buttX, buttY);
    if (aim.valid) { g.addColorStop(0, '#f4e2bd'); g.addColorStop(0.45, '#d7b47a'); g.addColorStop(1, '#5c3418'); }
    else { g.addColorStop(0, '#f2b3a8'); g.addColorStop(1, '#7a2a20'); }
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(tipX + nx * 4, tipY + ny * 4);
    ctx.lineTo(buttX + nx * 15, buttY + ny * 15);
    ctx.lineTo(buttX - nx * 15, buttY - ny * 15);
    ctx.lineTo(tipX - nx * 4, tipY - ny * 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#3b2a1c';
    ctx.beginPath();
    ctx.moveTo(tipX + nx * 4, tipY + ny * 4); ctx.lineTo(tipX - nx * 4, tipY - ny * 4);
    ctx.lineTo(tipX - nx * 4.1 - dx * 4, tipY - ny * 4.1 - dy * 4); ctx.lineTo(tipX + nx * 4.1 - dx * 4, tipY + ny * 4.1 - dy * 4);
    ctx.fill();

    // Power arc around the striker.
    const pw = aim.shown != null ? aim.shown : aim.power;
    if (pw > 0.005) {
      ctx.save();
      ctx.lineWidth = Math.max(3, 4 / scale);
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.arc(striker.x, striker.y, C.STRIKER_R + 9, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = `hsl(${130 - 125 * pw}, 70%, 45%)`;
      const a0 = Math.atan2(-dy, -dx);
      ctx.beginPath(); ctx.arc(striker.x, striker.y, C.STRIKER_R + 9, a0 - Math.PI * pw, a0 + Math.PI * pw); ctx.stroke();
      ctx.restore();
    }
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(view.rot);
    ctx.scale(scale, scale);
    ctx.translate(-F / 2, -F / 2);
    drawTable();

    const g = game || backdrop;
    const p = g.turn;
    const showStriker = game && striker && ['place', 'ai', 'aiAnim', 'remote', 'sending'].indexOf(phase) >= 0;

    if (game && phase === 'place' && human()) {
      // The shooter's placement area (3.9).
      const a = N.flip(g.sides[p], C.ZONE, F - C.ZONE), b = N.flip(g.sides[p], F - C.ZONE, F);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.fillRect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
    }

    // Pocket falls behind everything else.
    for (const e of effects) {
      if (e.kind !== 'fall') continue;
      const m = e.t / e.dur;
      const x = e.x + (e.px - e.x) * m, y = e.y + (e.py - e.y) * m;
      drawDisc(x, y, e.r, e.hole, e.kindIdx, 1 - m, 1 - 0.35 * m);
    }

    if (sim) {
      for (const b of sim.bodies) {
        if (!b.on) continue;
        if (b.striker) drawDisc(b.x, b.y, C.STRIKER_R, C.STRIKER_HOLE_R, 2);
        else drawDisc(b.x, b.y, C.PUCK_R, C.PUCK_HOLE_R, b.owner);
      }
    } else {
      for (const k of g.pucks) if (k.on) drawDisc(k.x, k.y, C.PUCK_R, C.PUCK_HOLE_R, k.owner);
      if (game && helpers.hints && phase === 'place' && human()) {
        for (const k of g.pucks) {
          if (!k.on) continue;
          // Only the shooter's own dark pucks; the aim line flags forbidden first contacts.
          if (k.owner === p && g.isDark(k)) dashedRing(k.x, k.y, C.PUCK_R + 4, '#3f7fc9');
        }
      }
      if (showStriker) drawDisc(striker.x, striker.y, C.STRIKER_R, C.STRIKER_HOLE_R, 2);
    }

    for (const e of effects) {
      if (e.kind !== 'pulse' || !game) continue;
      const k = game.pucks[e.id];
      if (!k || !k.on || sim) continue;
      const m = (e.t % 0.9) / 0.9;
      ctx.save();
      ctx.globalAlpha = (1 - m) * (1 - e.t / e.dur * 0.5);
      ctx.strokeStyle = '#dcae58';
      ctx.lineWidth = Math.max(2, 2.5 / scale);
      ctx.beginPath(); ctx.arc(k.x, k.y, C.PUCK_R + 3 + m * 22, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    if (showStriker) drawAim();
    ctx.restore();
  }

  /* --------------------------------------------------------------- loop */

  function drainEvents() {
    let n = 0;
    for (const e of sim.events) {
      if (e.type === 'pocket') {
        const pk = N.POCKETS.reduce((a, b) => (Math.hypot(e.x - a[0], e.y - a[1]) < Math.hypot(e.x - b[0], e.y - b[1]) ? a : b));
        effects.push({
          kind: 'fall', x: e.x, y: e.y, px: pk[0], py: pk[1], t: 0, dur: 0.22,
          r: e.striker ? C.STRIKER_R : C.PUCK_R, hole: e.striker ? C.STRIKER_HOLE_R : C.PUCK_HOLE_R,
          kindIdx: e.striker ? 2 : game.pucks[e.id].owner
        });
      }
      if (n < 8 && e.power > 40) { sound(e.type, e.power); n++; }
    }
    sim.events.length = 0;
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const dr = view.target - view.rot;
    view.rot = Math.abs(dr) < 1e-3 ? view.target : view.rot + dr * Math.min(1, dt * 5);

    if (game && !paused()) {
      if (phase === 'moving') {
        sim.advance(dt);
        drainEvents();
        if (sim.atRest()) { phase = 'settle'; settleTimer = 0.35; }
      } else if (phase === 'settle') {
        settleTimer -= dt;
        if (settleTimer <= 0) finishShot();
      } else if (phase === 'ai') pumpAI(dt);
      else if (phase === 'aiAnim') stepAIAnim(dt);
    }
    if (mode === 'online') {
      if (net.reloadFor && !drag && !net.queue.length && ['place', 'remote', 'result', 'lobby'].indexOf(phase) >= 0) location.reload();
      if (net.aimDirty && now - net.aimAt >= 70) sendAim();
      // No answer to a shot: ask the server for the current position.
      if (phase === 'sending' && now - net.sentAt > 8000) { net.sentAt = now; link.send({ t: 'sync' }); }
    }
    effects = effects.filter(e => (e.t += dt) < e.dur);
    // Redraw while something moves or changed; otherwise only twice a second.
    const busy = sim || drag || aiAnim || effects.length || view.rot !== view.target;
    if (busy || dirty || now - lastPaint > 500) {
      render();
      lastPaint = now;
      dirty = false;
      paints++;
    }
    requestAnimationFrame(frame);
  }
  function invalidate() { dirty = true; }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (mode === 'online') skipShot(); }
    else { link.wake(); invalidate(); }
  });
  window.addEventListener('online', () => link.wake());

  /* ---------------------------------------------------------- overlays */

  function open(sel) { $(sel).classList.add('open'); }
  function close(sel) { $(sel).classList.remove('open'); }
  const closeOverlay = close;
  function closeOverlays() { document.querySelectorAll('.overlay').forEach(o => o.classList.remove('open')); }

  function readNames() {
    settings.names = [$('#name0').value.trim(), $('#name1').value.trim()];
    save();
  }

  function syncMenu() {
    document.querySelectorAll('.seg[data-setting]').forEach(seg => {
      const key = seg.dataset.setting;
      seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', String(settings[key]) === b.dataset.value));
    });
    $('#field-level').style.display = settings.mode === 'ai' ? '' : 'none';
    $('#online-note').style.display = settings.mode === 'online' ? '' : 'none';
    $('#name0').value = settings.names[0] || '';
    $('#name0').placeholder = t(settings.mode === 'online' ? 'yourName' : 'p1');
    const n1 = $('#name1'), other = settings.mode !== 'hotseat';
    n1.disabled = other;
    n1.style.display = settings.mode === 'online' ? 'none' : '';
    $('.names').style.gridTemplateColumns = settings.mode === 'online' ? '1fr' : '';
    n1.value = other ? '' : settings.names[1] || '';
    n1.placeholder = settings.mode === 'ai' ? t('computer') : t('p2');
    $('#btn-resume').style.display = (game && game.winner === null && phase !== 'result') || (mode === 'online' && net.room) ? '' : 'none';
  }

  function applyLang() {
    document.documentElement.lang = settings.lang;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = t(el.dataset.i18nTitle);
      el.setAttribute('aria-label', el.title);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    $('#rules-body').innerHTML = RULES[settings.lang];
    renderLog();
    syncMenu();
    updateHud();
  }

  function openMenu() { closeOverlays(); syncMenu(); open('#menu'); }

  document.querySelectorAll('.seg[data-setting]').forEach(seg => {
    seg.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      const key = seg.dataset.setting;
      if (key !== 'lang') readNames();
      settings[key] = key === 'sets' ? +b.dataset.value : b.dataset.value;
      save();
      if (key === 'lang') applyLang(); else syncMenu();
    });
  });
  ['#name0', '#name1'].forEach(s => $(s).addEventListener('change', readNames));

  $('#btn-start').addEventListener('click', () => { ensureAudio(); startMatch(); });
  $('#btn-resume').addEventListener('click', () => {
    readNames();
    if (mode === 'online' && !game) showLobby(); else closeOverlays();
  });
  $('#lobby-copy').addEventListener('click', () => {
    const input = $('#lobby-link');
    const done = () => { $('#lobby-copy').textContent = t('copied'); setTimeout(() => { $('#lobby-copy').textContent = t('copy'); }, 1500); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(input.value).then(done, () => { input.select(); });
    else { input.select(); try { if (document.execCommand('copy')) done(); } catch (e) { /* the link stays selected */ } }
  });
  $('#lobby-share').addEventListener('click', () => {
    navigator.share({ title: 'Novuss', text: t('lobbyText'), url: $('#lobby-link').value }).catch(() => {});
  });
  $('#lobby-link').addEventListener('focus', e => e.target.select());
  $('#lobby-cancel').addEventListener('click', () => { leaveRoom(); game = null; phase = 'menu'; openMenu(); updateHud(); });
  $('#btn-join').addEventListener('click', () => { ensureAudio(); sendJoin(false); });
  $('#btn-watch').addEventListener('click', () => sendJoin(true));
  $('#join-name').addEventListener('keydown', e => { if (e.key === 'Enter' && !$('#btn-join').disabled) sendJoin(false); });
  $('#btn-join-menu').addEventListener('click', () => { leaveRoom(); mode = settings.mode; phase = 'menu'; openMenu(); });
  $('#btn-menu').addEventListener('click', openMenu);
  $('#btn-rules').addEventListener('click', () => open('#rules'));
  $('#btn-menu-rules').addEventListener('click', () => {
    open('#rules');
    $('#rules-body #about').scrollIntoView({ block: 'start' });
  });
  $('#btn-rules').addEventListener('click', () => { $('#rules .card').scrollTop = 0; });
  $('#btn-rules-close').addEventListener('click', () => close('#rules'));
  $('#btn-sound').addEventListener('click', () => {
    settings.sound = !settings.sound; save();
    if (settings.sound) ensureAudio();
    updateHud();
  });
  // The switches choose the helpers for the next match; a running match keeps its own.
  $('#opt-guide').addEventListener('change', e => { settings.guide = e.target.checked; save(); });
  $('#opt-hints').addEventListener('change', e => { settings.hints = e.target.checked; save(); });
  function toggleLog() {
    if (logMode === 'sheet') sheetOpen = !sheetOpen;
    else { settings.log = !settings.log; save(); }
    syncLogPanel();
    if (logVisible()) $('#log').scrollTop = $('#log').scrollHeight;
  }
  $('#btn-log').addEventListener('click', toggleLog);
  $('#log-close').addEventListener('click', toggleLog);
  $('#chat').addEventListener('submit', e => {
    e.preventDefault();
    const input = $('#chat-input'), text = input.value.trim();
    if (!text) return;
    // The server accepts one message a second per connection; keep the text until then.
    if (Date.now() - (net.chatAt || 0) < 1000) { toast(t('slowDown')); return; }
    if (link.send({ t: 'chat', text })) { input.value = ''; net.chatAt = Date.now(); }
    else toast(t('reconnecting'), 'bad');
  });

  window.addEventListener('resize', layout);
  if (window.ResizeObserver) new ResizeObserver(layout).observe($('#hud'));

  if (!onlineAvailable) {
    $('.seg[data-setting=mode] button[data-value=online]').remove();
    if (settings.mode === 'online') settings.mode = 'ai';
  }
  applyLang();
  layout();
  const invited = onlineAvailable && /^[a-z2-9]{6,16}$/.test(new URLSearchParams(location.search).get('room') || '');
  if (invited) openJoin(new URLSearchParams(location.search).get('room')); else openMenu();
  requestAnimationFrame(frame);

  // For automated checks.
  window.__novuss = { get game() { return game; }, get phase() { return phase; }, get striker() { return striker; }, get net() { return net; }, get paints() { return paints; }, link, get aim() { return aim; }, toWorld,
    toScreen(x, y) {
      const c = Math.cos(view.rot), s = Math.sin(view.rot), dx = x - F / 2, dy = y - F / 2;
      return [cx + (dx * c - dy * s) * scale, cy + (dx * s + dy * c) * scale];
    } };
})();
