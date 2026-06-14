import { DEFAULT_LOCALE, type SupportedLocale } from "./config.ts";

type MessageValue = string | ((params: Record<string, string | number>) => string);

export type TranslationKey =
  | "nav.searchPlaceholder"
  | "nav.portfolio"
  | "nav.cash"
  | "nav.deposit"
  | "nav.leaderboard"
  | "nav.earn"
  | "nav.rooms"
  | "nav.docs"
  | "nav.darkMode"
  | "nav.playBetCode"
  | "nav.builders"
  | "nav.support"
  | "nav.termsOfUse"
  | "nav.language"
  | "nav.logOut"
  | "nav.signIn"
  | "nav.signUp"
  | "nav.howItWorks"
  | "nav.categories"
  | "nav.more"
  | "tabs.trending"
  | "tabs.breaking"
  | "tabs.new"
  | "tabs.politics"
  | "tabs.sports"
  | "tabs.crypto"
  | "tabs.esports"
  | "tabs.iran"
  | "tabs.finance"
  | "tabs.geopolitics"
  | "tabs.tech"
  | "tabs.culture"
  | "tabs.economy"
  | "tabs.weather"
  | "tabs.mentions"
  | "tabs.elections"
  | "language.title"
  | "language.subtitle"
  | "language.active"
  | "auth.welcome"
  | "auth.google"
  | "auth.connecting"
  | "auth.terms"
  | "auth.privacy"
  | "auth.tour.market.title"
  | "auth.tour.market.description"
  | "auth.tour.market.cta"
  | "auth.tour.trade.title"
  | "auth.tour.trade.description"
  | "auth.tour.trade.cta"
  | "auth.tour.redeem.title"
  | "auth.tour.redeem.description"
  | "auth.tour.redeem.disclaimer"
  | "auth.tour.redeem.cta"
  | "home.allMarkets"
  | "home.openMarket"
  | "home.unableToLoad"
  | "home.retry"
  | "home.tryAgain"
  | "home.loadingMore"
  | "home.showMore"
  | "home.market"
  | "home.markets"
  | "common.yes"
  | "common.no"
  | "common.draw"
  | "portfolio.title"
  | "portfolio.eyebrow"
  | "portfolio.subtitle"
  | "portfolio.loadingTitle"
  | "portfolio.loadingCopy"
  | "portfolio.signInTitle"
  | "portfolio.signInCopy"
  | "portfolio.unableTitle"
  | "portfolio.openSignIn"
  | "portfolio.tryAgain"
  | "portfolio.cashLoading"
  | "portfolio.cashUnavailable"
  | "earn.title"
  | "earn.eyebrow"
  | "earn.subtitle"
  | "earn.loadingTitle"
  | "earn.loadingCopy"
  | "earn.signInTitle"
  | "earn.signInCopy"
  | "earn.unableTitle"
  | "earn.openSignIn"
  | "earn.tryAgain"
  | "earn.stepOneTitle"
  | "earn.stepOneCopy"
  | "earn.stepTwoTitle"
  | "earn.stepTwoCopy"
  | "earn.stepThreeTitle"
  | "earn.stepThreeCopy"
  | "earn.totalDeposited"
  | "earn.totalDepositedCopy"
  | "earn.vaultApy"
  | "earn.vaultApyCopy"
  | "earn.yourOwnership"
  | "earn.yourOwnershipCopy"
  | "earn.yourDeposits"
  | "earn.yourDepositsCopy"
  | "leaderboard.title"
  | "leaderboard.eyebrow"
  | "leaderboard.subtitle"
  | "leaderboard.topBuilder"
  | "leaderboard.realized"
  | "leaderboard.accuracy"
  | "leaderboard.streak"
  | "leaderboard.biggestHit"
  | "leaderboard.bestMultiple"
  | "leaderboard.loadingTitle"
  | "leaderboard.loadingCopy"
  | "leaderboard.unableTitle"
  | "leaderboard.emptyTitle"
  | "leaderboard.emptyCopy"
  | "leaderboard.globalRanking"
  | "leaderboard.updatedAt"
  | "rooms.title"
  | "rooms.eyebrow"
  | "rooms.subtitle"
  | "rooms.loadingTitle"
  | "rooms.loadingCopy"
  | "rooms.unableTitle"
  | "rooms.emptyTitle"
  | "rooms.emptyCopy"
  | "rooms.recentStacks"
  | "rooms.featuredMarkets"
  | "rooms.featuredComposite"
  | "rooms.openRoom"
  | "rooms.openCard"
  | "rooms.loadStack"
  | "rooms.openAiBuilder"
  | "rooms.theses"
  | "rooms.activity"
  | "rooms.updatedAt"
  | "stack.title"
  | "stack.subtitle"
  | "stack.builder"
  | "stack.ai"
  | "stack.code"
  | "stack.stake"
  | "stack.clear"
  | "stack.refreshQuote"
  | "stack.getLiveQuote";

type TranslationDictionary = Record<TranslationKey, MessageValue>;

const en: TranslationDictionary = {
  "nav.searchPlaceholder": "Search sabimarkets...",
  "nav.portfolio": "Portfolio",
  "nav.cash": "Cash",
  "nav.deposit": "Deposit",
  "nav.leaderboard": "Leaderboard",
  "nav.earn": "Earn",
  "nav.rooms": "Rooms",
  "nav.docs": "Docs",
  "nav.darkMode": "Dark mode",
  "nav.playBetCode": "Play bet code",
  "nav.builders": "Builders",
  "nav.support": "Support",
  "nav.termsOfUse": "Terms of Use",
  "nav.language": "Language",
  "nav.logOut": "Log out",
  "nav.signIn": "Log In",
  "nav.signUp": "Sign Up",
  "nav.howItWorks": "How it works",
  "nav.categories": "Categories",
  "nav.more": "More",
  "tabs.trending": "Trending",
  "tabs.breaking": "Breaking",
  "tabs.new": "New",
  "tabs.politics": "Politics",
  "tabs.sports": "Sports",
  "tabs.crypto": "Crypto",
  "tabs.esports": "Esports",
  "tabs.iran": "Iran",
  "tabs.finance": "Finance",
  "tabs.geopolitics": "Geopolitics",
  "tabs.tech": "Tech",
  "tabs.culture": "Culture",
  "tabs.economy": "Economy",
  "tabs.weather": "Weather",
  "tabs.mentions": "Mentions",
  "tabs.elections": "Elections",
  "language.title": "Language",
  "language.subtitle": "Choose the interface language.",
  "language.active": "Active",
  "auth.welcome": "Welcome to Sabimarket",
  "auth.google": "Continue with Google",
  "auth.connecting": "Connecting...",
  "auth.terms": "Terms",
  "auth.privacy": "Privacy",
  "auth.tour.market.title": "Pick a market",
  "auth.tour.market.description":
    "Browse live prediction markets and select the event you want to trade or stack.",
  "auth.tour.market.cta": "Next",
  "auth.tour.trade.title": "Place a trade",
  "auth.tour.trade.description":
    "Choose a side, set your stake, and let your smart account handle the on-chain execution.",
  "auth.tour.trade.cta": "Next",
  "auth.tour.redeem.title": "Redeem winnings",
  "auth.tour.redeem.description":
    "When markets resolve, your position settles on-chain and you can claim the outcome.",
  "auth.tour.redeem.disclaimer":
    "Smart accounts, copied stacks, and gasless execution are created for you automatically.",
  "auth.tour.redeem.cta": "Get Started",
  "home.allMarkets": "All markets",
  "home.openMarket": "Open market",
  "home.unableToLoad": "Unable to load markets",
  "home.retry": "Retry",
  "home.tryAgain": "Try again",
  "home.loadingMore": "Loading more markets...",
  "home.showMore": "Show more markets",
  "home.market": "market",
  "home.markets": "markets",
  "common.yes": "Yes",
  "common.no": "No",
  "common.draw": "Draw",
  "portfolio.title": "Portfolio",
  "portfolio.eyebrow": "Account",
  "portfolio.subtitle":
    "Track your open positions, separate funds currently in the market from wallet cash, and review how each stack is marked right now.",
  "portfolio.loadingTitle": "Loading portfolio",
  "portfolio.loadingCopy": "Fetching your current positions and funds in market.",
  "portfolio.signInTitle": "Sign in to view your portfolio",
  "portfolio.signInCopy":
    "Your portfolio page needs an authenticated session before it can load your on-chain positions.",
  "portfolio.unableTitle": "Unable to load portfolio",
  "portfolio.openSignIn": "Open sign in",
  "portfolio.tryAgain": "Try again",
  "portfolio.cashLoading": "Loading...",
  "portfolio.cashUnavailable": "Unavailable",
  "earn.title": "Earn",
  "earn.eyebrow": "Vault",
  "earn.subtitle":
    "Provide liquidity to the stack vault, track your ownership of the pool, and watch how vault yield compounds across different holding horizons.",
  "earn.loadingTitle": "Loading earn",
  "earn.loadingCopy": "Fetching your vault position and live liquidity.",
  "earn.signInTitle": "Sign in to view earn",
  "earn.signInCopy":
    "Your vault dashboard needs an authenticated session before it can load `/me/earn`.",
  "earn.unableTitle": "Unable to load earn",
  "earn.openSignIn": "Open sign in",
  "earn.tryAgain": "Try again",
  "earn.stepOneTitle": "Deposit USDC",
  "earn.stepOneCopy": "Move wallet cash into the LP vault and receive vault shares back.",
  "earn.stepTwoTitle": "Earn yield",
  "earn.stepTwoCopy": "Vault share price grows as protocol fees and resolved exposure accrue.",
  "earn.stepThreeTitle": "Withdraw",
  "earn.stepThreeCopy":
    "Initiate redemption anytime and claim after the vault withdrawal delay.",
  "earn.totalDeposited": "Total deposited",
  "earn.totalDepositedCopy": "Current vault TVL backing stack liquidity.",
  "earn.vaultApy": "Vault 7D APY",
  "earn.vaultApyCopy": "Annualized from recorded vault share-price history.",
  "earn.yourOwnership": "Your ownership",
  "earn.yourOwnershipCopy": "Share of the vault based on your LP token balance.",
  "earn.yourDeposits": "Your deposits",
  "earn.yourDepositsCopy": "Current asset value of your vault shares.",
  "leaderboard.title": "Leaderboard",
  "leaderboard.eyebrow": "Competition",
  "leaderboard.subtitle":
    "Track the strongest stack builders by realized P&L, accuracy, streaks, and biggest hits.",
  "leaderboard.topBuilder": "Top builder",
  "leaderboard.realized": "Realized",
  "leaderboard.accuracy": "Accuracy",
  "leaderboard.streak": "Streak",
  "leaderboard.biggestHit": "Biggest hit",
  "leaderboard.bestMultiple": "Best multiple",
  "leaderboard.loadingTitle": "Loading leaderboard",
  "leaderboard.loadingCopy": "Collecting the best performing structured stack builders.",
  "leaderboard.unableTitle": "Unable to load leaderboard",
  "leaderboard.emptyTitle": "No leaderboard entries yet",
  "leaderboard.emptyCopy":
    "Settled stack positions will populate the ranking once builders start closing positions.",
  "leaderboard.globalRanking": "Global stack ranking",
  "leaderboard.updatedAt": ({ value }) => `Updated ${value}`,
  "rooms.title": "Theme rooms",
  "rooms.eyebrow": "Live thesis rooms",
  "rooms.subtitle":
    "Follow the strongest event and macro narratives as living stack rooms with featured markets and recent structured positions.",
  "rooms.loadingTitle": "Loading rooms",
  "rooms.loadingCopy": "Collecting live room summaries, featured markets, and recent stack activity.",
  "rooms.unableTitle": "Unable to load rooms",
  "rooms.emptyTitle": "No rooms available yet",
  "rooms.emptyCopy": "Rooms will appear once theme definitions and stack activity are available.",
  "rooms.recentStacks": "Recent stacks",
  "rooms.featuredMarkets": "Featured markets",
  "rooms.featuredComposite": "Featured composite",
  "rooms.openRoom": "Open room",
  "rooms.openCard": "Open card",
  "rooms.loadStack": "Load stack",
  "rooms.openAiBuilder": "Open AI builder",
  "rooms.theses": "Pinned theses",
  "rooms.activity": "Activity",
  "rooms.updatedAt": ({ value }) => `Updated ${value}`,
  "stack.title": "Your stack",
  "stack.subtitle": "Review the legs, set a stake, and request a fresh stack quote.",
  "stack.builder": "Builder",
  "stack.ai": "AI",
  "stack.code": "Code",
  "stack.stake": "Stake",
  "stack.clear": "Clear",
  "stack.refreshQuote": "Refresh live quote",
  "stack.getLiveQuote": "Get live quote",
};

const es: Partial<TranslationDictionary> = {
  "nav.searchPlaceholder": "Buscar en Sabimarket...",
  "nav.portfolio": "Portafolio",
  "nav.cash": "Efectivo",
  "nav.deposit": "Depositar",
  "nav.leaderboard": "Clasificación",
  "nav.earn": "Rendimiento",
  "nav.rooms": "Salas",
  "nav.docs": "Docs",
  "nav.darkMode": "Modo oscuro",
  "nav.playBetCode": "Jugar código de apuesta",
  "nav.builders": "Constructores",
  "nav.support": "Soporte",
  "nav.termsOfUse": "Términos de uso",
  "nav.language": "Idioma",
  "nav.logOut": "Cerrar sesión",
  "nav.signIn": "Iniciar sesión",
  "nav.signUp": "Registrarse",
  "nav.howItWorks": "Cómo funciona",
  "nav.categories": "Categorías",
  "nav.more": "Más",
  "tabs.trending": "Tendencias",
  "tabs.breaking": "Última hora",
  "tabs.new": "Nuevos",
  "tabs.politics": "Política",
  "tabs.sports": "Deportes",
  "tabs.crypto": "Cripto",
  "tabs.esports": "Esports",
  "tabs.iran": "Irán",
  "tabs.finance": "Finanzas",
  "tabs.geopolitics": "Geopolítica",
  "tabs.tech": "Tecnología",
  "tabs.culture": "Cultura",
  "tabs.economy": "Economía",
  "tabs.weather": "Clima",
  "tabs.mentions": "Menciones",
  "tabs.elections": "Elecciones",
  "language.title": "Idioma",
  "language.subtitle": "Elige el idioma de la interfaz.",
  "language.active": "Activo",
  "auth.welcome": "Bienvenido a Sabimarket",
  "auth.google": "Continuar con Google",
  "auth.connecting": "Conectando...",
  "auth.terms": "Términos",
  "auth.privacy": "Privacidad",
  "auth.tour.market.title": "Elige un mercado",
  "auth.tour.market.description":
    "Explora mercados de predicción en vivo y selecciona el evento que quieres operar o apilar.",
  "auth.tour.market.cta": "Siguiente",
  "auth.tour.trade.title": "Haz una operación",
  "auth.tour.trade.description":
    "Elige un lado, define tu stake y deja que tu cuenta inteligente gestione la ejecución on-chain.",
  "auth.tour.trade.cta": "Siguiente",
  "auth.tour.redeem.title": "Canjea ganancias",
  "auth.tour.redeem.description":
    "Cuando los mercados se resuelven, tu posición se liquida on-chain y puedes reclamar el resultado.",
  "auth.tour.redeem.disclaimer":
    "Las cuentas inteligentes, stacks copiados y ejecución gasless se crean automáticamente para ti.",
  "auth.tour.redeem.cta": "Empezar",
  "home.allMarkets": "Todos los mercados",
  "home.openMarket": "Mercado abierto",
  "home.unableToLoad": "No se pudieron cargar los mercados",
  "home.retry": "Reintentar",
  "home.tryAgain": "Intentar de nuevo",
  "home.loadingMore": "Cargando más mercados...",
  "home.showMore": "Mostrar más mercados",
  "home.market": "mercado",
  "home.markets": "mercados",
  "common.yes": "Sí",
  "common.no": "No",
  "common.draw": "Empate",
  "portfolio.title": "Portafolio",
  "portfolio.eyebrow": "Cuenta",
  "portfolio.subtitle":
    "Sigue tus posiciones abiertas, separa los fondos actualmente en mercado del efectivo en tu cartera y revisa cómo se valora cada stack ahora mismo.",
  "portfolio.loadingTitle": "Cargando portafolio",
  "portfolio.loadingCopy": "Obteniendo tus posiciones actuales y fondos en mercado.",
  "portfolio.signInTitle": "Inicia sesión para ver tu portafolio",
  "portfolio.signInCopy":
    "Tu página de portafolio necesita una sesión autenticada antes de cargar tus posiciones on-chain.",
  "portfolio.unableTitle": "No se pudo cargar el portafolio",
  "portfolio.openSignIn": "Abrir inicio de sesión",
  "portfolio.tryAgain": "Intentar de nuevo",
  "portfolio.cashLoading": "Cargando...",
  "portfolio.cashUnavailable": "No disponible",
  "earn.title": "Rendimiento",
  "earn.eyebrow": "Vault",
  "earn.subtitle":
    "Aporta liquidez al vault de stacks, sigue tu propiedad del pool y observa cómo el rendimiento del vault se compone en distintos horizontes.",
  "earn.loadingTitle": "Cargando rendimiento",
  "earn.loadingCopy": "Obteniendo tu posición del vault y la liquidez en vivo.",
  "earn.signInTitle": "Inicia sesión para ver rendimiento",
  "earn.signInCopy":
    "Tu panel del vault necesita una sesión autenticada antes de cargar `/me/earn`.",
  "earn.unableTitle": "No se pudo cargar rendimiento",
  "earn.openSignIn": "Abrir inicio de sesión",
  "earn.tryAgain": "Intentar de nuevo",
  "earn.stepOneTitle": "Deposita USDC",
  "earn.stepOneCopy": "Mueve efectivo de tu cartera al vault LP y recibe participaciones del vault.",
  "earn.stepTwoTitle": "Gana rendimiento",
  "earn.stepTwoCopy":
    "El precio de la participación del vault crece a medida que se acumulan comisiones y exposición resuelta.",
  "earn.stepThreeTitle": "Retirar",
  "earn.stepThreeCopy":
    "Inicia un rescate en cualquier momento y reclama después del retraso del vault.",
  "earn.totalDeposited": "Total depositado",
  "earn.totalDepositedCopy": "TVL actual del vault que respalda la liquidez de stacks.",
  "earn.vaultApy": "APY 7D del vault",
  "earn.vaultApyCopy": "Anualizado a partir del historial del precio de participación del vault.",
  "earn.yourOwnership": "Tu propiedad",
  "earn.yourOwnershipCopy": "Participación del vault según tu balance de tokens LP.",
  "earn.yourDeposits": "Tus depósitos",
  "earn.yourDepositsCopy": "Valor actual de los activos de tus participaciones del vault.",
  "leaderboard.title": "Clasificación",
  "leaderboard.eyebrow": "Competencia",
  "leaderboard.subtitle":
    "Sigue a los mejores constructores de stacks por P&L realizado, precisión, rachas y mayores aciertos.",
  "leaderboard.topBuilder": "Mejor constructor",
  "leaderboard.realized": "Realizado",
  "leaderboard.accuracy": "Precisión",
  "leaderboard.streak": "Racha",
  "leaderboard.biggestHit": "Mayor acierto",
  "leaderboard.bestMultiple": "Mejor múltiplo",
  "leaderboard.loadingTitle": "Cargando clasificación",
  "leaderboard.loadingCopy": "Recopilando a los constructores de stacks estructurados con mejor rendimiento.",
  "leaderboard.unableTitle": "No se pudo cargar la clasificación",
  "leaderboard.emptyTitle": "Aún no hay entradas",
  "leaderboard.emptyCopy":
    "Las posiciones de stack liquidadas llenarán la clasificación cuando los usuarios empiecen a cerrar posiciones.",
  "leaderboard.globalRanking": "Ranking global de stacks",
  "leaderboard.updatedAt": ({ value }) => `Actualizado ${value}`,
  "stack.title": "Tu stack",
  "stack.subtitle": "Revisa las legs, define un stake y solicita una nueva cotización.",
  "stack.builder": "Constructor",
  "stack.ai": "IA",
  "stack.code": "Código",
  "stack.stake": "Stake",
  "stack.clear": "Limpiar",
  "stack.refreshQuote": "Actualizar cotización",
  "stack.getLiveQuote": "Obtener cotización",
};

const fr: Partial<TranslationDictionary> = {
  "nav.searchPlaceholder": "Rechercher sur Sabimarket...",
  "nav.portfolio": "Portefeuille",
  "nav.cash": "Cash",
  "nav.deposit": "Déposer",
  "nav.leaderboard": "Classement",
  "nav.earn": "Rendement",
  "nav.rooms": "Salles",
  "nav.docs": "Docs",
  "nav.darkMode": "Mode sombre",
  "nav.playBetCode": "Jouer un code de pari",
  "nav.builders": "Builders",
  "nav.support": "Support",
  "nav.termsOfUse": "Conditions d’utilisation",
  "nav.language": "Langue",
  "nav.logOut": "Se déconnecter",
  "nav.signIn": "Se connecter",
  "nav.signUp": "S’inscrire",
  "nav.howItWorks": "Comment ça marche",
  "nav.categories": "Catégories",
  "nav.more": "Plus",
  "tabs.trending": "Tendances",
  "tabs.breaking": "Urgent",
  "tabs.new": "Nouveaux",
  "tabs.politics": "Politique",
  "tabs.sports": "Sports",
  "tabs.crypto": "Crypto",
  "tabs.esports": "Esports",
  "tabs.iran": "Iran",
  "tabs.finance": "Finance",
  "tabs.geopolitics": "Géopolitique",
  "tabs.tech": "Tech",
  "tabs.culture": "Culture",
  "tabs.economy": "Économie",
  "tabs.weather": "Météo",
  "tabs.mentions": "Mentions",
  "tabs.elections": "Élections",
  "language.title": "Langue",
  "language.subtitle": "Choisissez la langue de l’interface.",
  "language.active": "Actif",
  "auth.welcome": "Bienvenue sur Sabimarket",
  "auth.google": "Continuer avec Google",
  "auth.connecting": "Connexion...",
  "auth.terms": "Conditions",
  "auth.privacy": "Confidentialité",
  "auth.tour.market.title": "Choisir un marché",
  "auth.tour.market.description":
    "Parcourez les marchés de prédiction en direct et sélectionnez l’événement à trader ou à empiler.",
  "auth.tour.market.cta": "Suivant",
  "auth.tour.trade.title": "Placer un trade",
  "auth.tour.trade.description":
    "Choisissez un côté, définissez votre mise et laissez votre smart account gérer l’exécution on-chain.",
  "auth.tour.trade.cta": "Suivant",
  "auth.tour.redeem.title": "Encaisser les gains",
  "auth.tour.redeem.description":
    "Quand les marchés se résolvent, votre position est réglée on-chain et vous pouvez réclamer le résultat.",
  "auth.tour.redeem.disclaimer":
    "Les smart accounts, stacks copiés et l’exécution sans gas sont créés automatiquement pour vous.",
  "auth.tour.redeem.cta": "Commencer",
  "home.allMarkets": "Tous les marchés",
  "home.openMarket": "Marché ouvert",
  "home.unableToLoad": "Impossible de charger les marchés",
  "home.retry": "Réessayer",
  "home.tryAgain": "Réessayer",
  "home.loadingMore": "Chargement de plus de marchés...",
  "home.showMore": "Afficher plus de marchés",
  "home.market": "marché",
  "home.markets": "marchés",
  "common.yes": "Oui",
  "common.no": "Non",
  "common.draw": "Nul",
  "portfolio.title": "Portefeuille",
  "portfolio.eyebrow": "Compte",
  "portfolio.subtitle":
    "Suivez vos positions ouvertes, séparez les fonds actuellement exposés du cash de votre wallet, et voyez comment chaque stack est valorisé en ce moment.",
  "portfolio.loadingTitle": "Chargement du portefeuille",
  "portfolio.loadingCopy": "Récupération de vos positions et fonds exposés.",
  "portfolio.signInTitle": "Connectez-vous pour voir votre portefeuille",
  "portfolio.signInCopy":
    "Votre page portefeuille nécessite une session authentifiée avant de charger vos positions on-chain.",
  "portfolio.unableTitle": "Impossible de charger le portefeuille",
  "portfolio.openSignIn": "Ouvrir la connexion",
  "portfolio.tryAgain": "Réessayer",
  "portfolio.cashLoading": "Chargement...",
  "portfolio.cashUnavailable": "Indisponible",
  "earn.title": "Rendement",
  "earn.eyebrow": "Vault",
  "earn.subtitle":
    "Fournissez de la liquidité au vault de stacks, suivez votre part du pool et observez le rendement se composer selon différents horizons.",
  "earn.loadingTitle": "Chargement du rendement",
  "earn.loadingCopy": "Récupération de votre position dans le vault et de la liquidité en direct.",
  "earn.signInTitle": "Connectez-vous pour voir le rendement",
  "earn.signInCopy":
    "Votre tableau de bord du vault nécessite une session authentifiée avant de charger `/me/earn`.",
  "earn.unableTitle": "Impossible de charger le rendement",
  "earn.openSignIn": "Ouvrir la connexion",
  "earn.tryAgain": "Réessayer",
  "earn.stepOneTitle": "Déposer des USDC",
  "earn.stepOneCopy": "Déplacez le cash de votre wallet vers le vault LP et recevez des parts du vault.",
  "earn.stepTwoTitle": "Gagner du rendement",
  "earn.stepTwoCopy":
    "Le prix de la part du vault augmente à mesure que les frais et l’exposition résolue s’accumulent.",
  "earn.stepThreeTitle": "Retirer",
  "earn.stepThreeCopy":
    "Lancez un rachat à tout moment et réclamez après le délai de retrait du vault.",
  "earn.totalDeposited": "Total déposé",
  "earn.totalDepositedCopy": "TVL actuel du vault soutenant la liquidité des stacks.",
  "earn.vaultApy": "APY 7J du vault",
  "earn.vaultApyCopy": "Annualisé à partir de l’historique du prix de part du vault.",
  "earn.yourOwnership": "Votre part",
  "earn.yourOwnershipCopy": "Part du vault selon votre solde de tokens LP.",
  "earn.yourDeposits": "Vos dépôts",
  "earn.yourDepositsCopy": "Valeur actuelle des actifs représentés par vos parts du vault.",
  "leaderboard.title": "Classement",
  "leaderboard.eyebrow": "Compétition",
  "leaderboard.subtitle":
    "Suivez les meilleurs builders de stacks selon le P&L réalisé, la précision, les séries et les plus gros hits.",
  "leaderboard.topBuilder": "Meilleur builder",
  "leaderboard.realized": "Réalisé",
  "leaderboard.accuracy": "Précision",
  "leaderboard.streak": "Série",
  "leaderboard.biggestHit": "Plus gros hit",
  "leaderboard.bestMultiple": "Meilleur multiple",
  "leaderboard.loadingTitle": "Chargement du classement",
  "leaderboard.loadingCopy":
    "Collecte des builders de stacks structurés les plus performants.",
  "leaderboard.unableTitle": "Impossible de charger le classement",
  "leaderboard.emptyTitle": "Aucune entrée pour l’instant",
  "leaderboard.emptyCopy":
    "Les positions de stack réglées rempliront le classement dès que les builders commenceront à fermer des positions.",
  "leaderboard.globalRanking": "Classement global des stacks",
  "leaderboard.updatedAt": ({ value }) => `Mis à jour ${value}`,
  "stack.title": "Votre stack",
  "stack.subtitle": "Vérifiez les legs, définissez une mise et demandez une nouvelle cotation.",
  "stack.builder": "Builder",
  "stack.ai": "IA",
  "stack.code": "Code",
  "stack.stake": "Mise",
  "stack.clear": "Effacer",
  "stack.refreshQuote": "Actualiser la cotation",
  "stack.getLiveQuote": "Obtenir une cotation",
};

const pt: Partial<TranslationDictionary> = {
  "nav.searchPlaceholder": "Buscar no Sabimarket...",
  "nav.portfolio": "Portfólio",
  "nav.cash": "Caixa",
  "nav.deposit": "Depositar",
  "nav.leaderboard": "Classificação",
  "nav.earn": "Rendimento",
  "nav.rooms": "Salas",
  "nav.docs": "Docs",
  "nav.darkMode": "Modo escuro",
  "nav.playBetCode": "Usar código de aposta",
  "nav.builders": "Builders",
  "nav.support": "Suporte",
  "nav.termsOfUse": "Termos de uso",
  "nav.language": "Idioma",
  "nav.logOut": "Sair",
  "nav.signIn": "Entrar",
  "nav.signUp": "Cadastrar-se",
  "nav.howItWorks": "Como funciona",
  "nav.categories": "Categorias",
  "nav.more": "Mais",
  "tabs.trending": "Em alta",
  "tabs.breaking": "Urgente",
  "tabs.new": "Novos",
  "tabs.politics": "Política",
  "tabs.sports": "Esportes",
  "tabs.crypto": "Cripto",
  "tabs.esports": "Esports",
  "tabs.iran": "Irã",
  "tabs.finance": "Finanças",
  "tabs.geopolitics": "Geopolítica",
  "tabs.tech": "Tecnologia",
  "tabs.culture": "Cultura",
  "tabs.economy": "Economia",
  "tabs.weather": "Clima",
  "tabs.mentions": "Menções",
  "tabs.elections": "Eleições",
  "language.title": "Idioma",
  "language.subtitle": "Escolha o idioma da interface.",
  "language.active": "Ativo",
  "auth.welcome": "Bem-vindo ao Sabimarket",
  "auth.google": "Continuar com Google",
  "auth.connecting": "Conectando...",
  "auth.terms": "Termos",
  "auth.privacy": "Privacidade",
  "auth.tour.market.title": "Escolha um mercado",
  "auth.tour.market.description":
    "Navegue pelos mercados de previsão ao vivo e selecione o evento que deseja negociar ou empilhar.",
  "auth.tour.market.cta": "Próximo",
  "auth.tour.trade.title": "Faça uma operação",
  "auth.tour.trade.description":
    "Escolha um lado, defina sua stake e deixe sua conta inteligente cuidar da execução on-chain.",
  "auth.tour.trade.cta": "Próximo",
  "auth.tour.redeem.title": "Resgate ganhos",
  "auth.tour.redeem.description":
    "Quando os mercados se resolvem, sua posição é liquidada on-chain e você pode reivindicar o resultado.",
  "auth.tour.redeem.disclaimer":
    "Contas inteligentes, stacks copiados e execução sem gas são criados automaticamente para você.",
  "auth.tour.redeem.cta": "Começar",
  "home.allMarkets": "Todos os mercados",
  "home.openMarket": "Mercado aberto",
  "home.unableToLoad": "Não foi possível carregar os mercados",
  "home.retry": "Tentar novamente",
  "home.tryAgain": "Tentar novamente",
  "home.loadingMore": "Carregando mais mercados...",
  "home.showMore": "Mostrar mais mercados",
  "home.market": "mercado",
  "home.markets": "mercados",
  "common.yes": "Sim",
  "common.no": "Não",
  "common.draw": "Empate",
  "portfolio.title": "Portfólio",
  "portfolio.eyebrow": "Conta",
  "portfolio.subtitle":
    "Acompanhe suas posições abertas, separe os fundos atualmente expostos do caixa da carteira e revise como cada stack está sendo marcado agora.",
  "portfolio.loadingTitle": "Carregando portfólio",
  "portfolio.loadingCopy": "Buscando suas posições atuais e fundos em mercado.",
  "portfolio.signInTitle": "Entre para ver seu portfólio",
  "portfolio.signInCopy":
    "Sua página de portfólio precisa de uma sessão autenticada antes de carregar suas posições on-chain.",
  "portfolio.unableTitle": "Não foi possível carregar o portfólio",
  "portfolio.openSignIn": "Abrir login",
  "portfolio.tryAgain": "Tentar novamente",
  "portfolio.cashLoading": "Carregando...",
  "portfolio.cashUnavailable": "Indisponível",
  "earn.title": "Rendimento",
  "earn.eyebrow": "Vault",
  "earn.subtitle":
    "Forneça liquidez para o vault de stacks, acompanhe sua participação no pool e veja como o rendimento se compõe em diferentes horizontes.",
  "earn.loadingTitle": "Carregando rendimento",
  "earn.loadingCopy": "Buscando sua posição no vault e a liquidez ao vivo.",
  "earn.signInTitle": "Entre para ver rendimento",
  "earn.signInCopy":
    "Seu painel do vault precisa de uma sessão autenticada antes de carregar `/me/earn`.",
  "earn.unableTitle": "Não foi possível carregar rendimento",
  "earn.openSignIn": "Abrir login",
  "earn.tryAgain": "Tentar novamente",
  "earn.stepOneTitle": "Deposite USDC",
  "earn.stepOneCopy": "Mova o caixa da carteira para o vault LP e receba cotas do vault.",
  "earn.stepTwoTitle": "Ganhe rendimento",
  "earn.stepTwoCopy":
    "O preço da cota do vault cresce conforme taxas e exposição resolvida se acumulam.",
  "earn.stepThreeTitle": "Retirar",
  "earn.stepThreeCopy":
    "Inicie um resgate a qualquer momento e reivindique após o atraso de retirada do vault.",
  "earn.totalDeposited": "Total depositado",
  "earn.totalDepositedCopy": "TVL atual do vault que sustenta a liquidez dos stacks.",
  "earn.vaultApy": "APY 7D do vault",
  "earn.vaultApyCopy": "Anualizado a partir do histórico do preço da cota do vault.",
  "earn.yourOwnership": "Sua participação",
  "earn.yourOwnershipCopy": "Fatia do vault com base no seu saldo de tokens LP.",
  "earn.yourDeposits": "Seus depósitos",
  "earn.yourDepositsCopy": "Valor atual dos ativos das suas cotas do vault.",
  "leaderboard.title": "Classificação",
  "leaderboard.eyebrow": "Competição",
  "leaderboard.subtitle":
    "Acompanhe os melhores builders de stacks por P&L realizado, acurácia, sequência e maiores acertos.",
  "leaderboard.topBuilder": "Melhor builder",
  "leaderboard.realized": "Realizado",
  "leaderboard.accuracy": "Acurácia",
  "leaderboard.streak": "Sequência",
  "leaderboard.biggestHit": "Maior acerto",
  "leaderboard.bestMultiple": "Melhor múltiplo",
  "leaderboard.loadingTitle": "Carregando classificação",
  "leaderboard.loadingCopy":
    "Coletando os builders de stacks estruturados com melhor desempenho.",
  "leaderboard.unableTitle": "Não foi possível carregar a classificação",
  "leaderboard.emptyTitle": "Ainda não há entradas",
  "leaderboard.emptyCopy":
    "Posições de stack liquidadas preencherão o ranking quando os builders começarem a fechar posições.",
  "leaderboard.globalRanking": "Ranking global de stacks",
  "leaderboard.updatedAt": ({ value }) => `Atualizado ${value}`,
  "stack.title": "Seu stack",
  "stack.subtitle": "Revise as legs, defina uma stake e solicite uma nova cotação.",
  "stack.builder": "Builder",
  "stack.ai": "IA",
  "stack.code": "Código",
  "stack.stake": "Stake",
  "stack.clear": "Limpar",
  "stack.refreshQuote": "Atualizar cotação",
  "stack.getLiveQuote": "Obter cotação",
};

const de: Partial<TranslationDictionary> = {
  "nav.searchPlaceholder": "Sabimarkets durchsuchen...",
  "nav.portfolio": "Portfolio",
  "nav.cash": "Guthaben",
  "nav.deposit": "Einzahlen",
  "nav.leaderboard": "Bestenliste",
  "nav.earn": "Rendite",
  "nav.rooms": "Räume",
  "nav.docs": "Docs",
  "nav.darkMode": "Dunkelmodus",
  "nav.playBetCode": "Wettschein-Code eingeben",
  "nav.builders": "Builder",
  "nav.support": "Support",
  "nav.termsOfUse": "Nutzungsbedingungen",
  "nav.language": "Sprache",
  "nav.logOut": "Abmelden",
  "nav.signIn": "Anmelden",
  "nav.signUp": "Registrieren",
  "nav.howItWorks": "So funktioniert's",
  "nav.categories": "Kategorien",
  "nav.more": "Mehr",
  "tabs.trending": "Trends",
  "tabs.breaking": "Aktuell",
  "tabs.new": "Neu",
  "tabs.politics": "Politik",
  "tabs.sports": "Sport",
  "tabs.crypto": "Krypto",
  "tabs.esports": "Esports",
  "tabs.iran": "Iran",
  "tabs.finance": "Finanzen",
  "tabs.geopolitics": "Geopolitik",
  "tabs.tech": "Tech",
  "tabs.culture": "Kultur",
  "tabs.economy": "Wirtschaft",
  "tabs.weather": "Wetter",
  "tabs.mentions": "Erwähnungen",
  "tabs.elections": "Wahlen",
  "language.title": "Sprache",
  "language.subtitle": "Wähle die Sprache der Oberfläche.",
  "language.active": "Aktiv",
  "auth.welcome": "Willkommen bei Sabimarket",
  "auth.google": "Mit Google fortfahren",
  "auth.connecting": "Verbindung wird hergestellt...",
  "auth.terms": "Bedingungen",
  "auth.privacy": "Datenschutz",
  "home.allMarkets": "Alle Märkte",
  "home.openMarket": "Offener Markt",
  "home.unableToLoad": "Märkte konnten nicht geladen werden",
  "home.retry": "Erneut laden",
  "home.tryAgain": "Noch einmal versuchen",
  "home.loadingMore": "Weitere Märkte werden geladen...",
  "home.showMore": "Mehr Märkte anzeigen",
  "home.market": "Markt",
  "home.markets": "Märkte",
  "common.yes": "Ja",
  "common.no": "Nein",
  "common.draw": "Unentschieden",
};

const ja: Partial<TranslationDictionary> = {
  "nav.searchPlaceholder": "Sabimarketを検索...",
  "nav.portfolio": "ポートフォリオ",
  "nav.cash": "現金",
  "nav.deposit": "入金",
  "nav.leaderboard": "ランキング",
  "nav.earn": "利回り",
  "nav.rooms": "ルーム",
  "nav.docs": "Docs",
  "nav.darkMode": "ダークモード",
  "nav.playBetCode": "ベットコードを使う",
  "nav.builders": "ビルダー",
  "nav.support": "サポート",
  "nav.termsOfUse": "利用規約",
  "nav.language": "言語",
  "nav.logOut": "ログアウト",
  "nav.signIn": "ログイン",
  "nav.signUp": "登録",
  "nav.howItWorks": "使い方",
  "nav.categories": "カテゴリ",
  "nav.more": "もっと見る",
  "tabs.trending": "トレンド",
  "tabs.breaking": "速報",
  "tabs.new": "新着",
  "tabs.politics": "政治",
  "tabs.sports": "スポーツ",
  "tabs.crypto": "暗号資産",
  "tabs.esports": "eスポーツ",
  "tabs.iran": "イラン",
  "tabs.finance": "金融",
  "tabs.geopolitics": "地政学",
  "tabs.tech": "テック",
  "tabs.culture": "カルチャー",
  "tabs.economy": "経済",
  "tabs.weather": "天気",
  "tabs.mentions": "話題",
  "tabs.elections": "選挙",
  "language.title": "言語",
  "language.subtitle": "表示言語を選択してください。",
  "language.active": "選択中",
  "auth.welcome": "Sabimarketへようこそ",
  "auth.google": "Googleで続ける",
  "auth.connecting": "接続中...",
  "auth.terms": "利用規約",
  "auth.privacy": "プライバシー",
  "home.allMarkets": "すべての市場",
  "home.openMarket": "オープン市場",
  "home.unableToLoad": "市場を読み込めませんでした",
  "home.retry": "再読み込み",
  "home.tryAgain": "もう一度試す",
  "home.loadingMore": "さらに市場を読み込み中...",
  "home.showMore": "もっと市場を表示",
  "home.market": "市場",
  "home.markets": "市場",
  "common.yes": "はい",
  "common.no": "いいえ",
  "common.draw": "引き分け",
};

const zh: Partial<TranslationDictionary> = {
  "nav.searchPlaceholder": "搜索 Sabimarket...",
  "nav.portfolio": "投资组合",
  "nav.cash": "现金",
  "nav.deposit": "充值",
  "nav.leaderboard": "排行榜",
  "nav.earn": "收益",
  "nav.rooms": "房间",
  "nav.docs": "Docs",
  "nav.darkMode": "深色模式",
  "nav.playBetCode": "使用投注代码",
  "nav.builders": "构建器",
  "nav.support": "支持",
  "nav.termsOfUse": "使用条款",
  "nav.language": "语言",
  "nav.logOut": "退出登录",
  "nav.signIn": "登录",
  "nav.signUp": "注册",
  "nav.howItWorks": "运作方式",
  "nav.categories": "分类",
  "nav.more": "更多",
  "tabs.trending": "热门",
  "tabs.breaking": "快讯",
  "tabs.new": "最新",
  "tabs.politics": "政治",
  "tabs.sports": "体育",
  "tabs.crypto": "加密",
  "tabs.esports": "电竞",
  "tabs.iran": "伊朗",
  "tabs.finance": "金融",
  "tabs.geopolitics": "地缘政治",
  "tabs.tech": "科技",
  "tabs.culture": "文化",
  "tabs.economy": "经济",
  "tabs.weather": "天气",
  "tabs.mentions": "热议",
  "tabs.elections": "选举",
  "language.title": "语言",
  "language.subtitle": "选择界面语言。",
  "language.active": "已启用",
  "auth.welcome": "欢迎来到 Sabimarket",
  "auth.google": "使用 Google 继续",
  "auth.connecting": "连接中...",
  "auth.terms": "条款",
  "auth.privacy": "隐私",
  "home.allMarkets": "全部市场",
  "home.openMarket": "开放市场",
  "home.unableToLoad": "无法加载市场",
  "home.retry": "重试",
  "home.tryAgain": "再试一次",
  "home.loadingMore": "正在加载更多市场...",
  "home.showMore": "显示更多市场",
  "home.market": "市场",
  "home.markets": "市场",
  "common.yes": "是",
  "common.no": "否",
  "common.draw": "平局",
};

const id: Partial<TranslationDictionary> = {
  "nav.searchPlaceholder": "Cari di Sabimarket...",
  "nav.portfolio": "Portofolio",
  "nav.cash": "Kas",
  "nav.deposit": "Deposit",
  "nav.leaderboard": "Papan peringkat",
  "nav.earn": "Imbal hasil",
  "nav.rooms": "Ruang",
  "nav.docs": "Docs",
  "nav.darkMode": "Mode gelap",
  "nav.playBetCode": "Gunakan kode taruhan",
  "nav.builders": "Builder",
  "nav.support": "Bantuan",
  "nav.termsOfUse": "Syarat Penggunaan",
  "nav.language": "Bahasa",
  "nav.logOut": "Keluar",
  "nav.signIn": "Masuk",
  "nav.signUp": "Daftar",
  "nav.howItWorks": "Cara kerja",
  "nav.categories": "Kategori",
  "nav.more": "Lainnya",
  "tabs.trending": "Tren",
  "tabs.breaking": "Terkini",
  "tabs.new": "Baru",
  "tabs.politics": "Politik",
  "tabs.sports": "Olahraga",
  "tabs.crypto": "Kripto",
  "tabs.esports": "Esports",
  "tabs.iran": "Iran",
  "tabs.finance": "Keuangan",
  "tabs.geopolitics": "Geopolitik",
  "tabs.tech": "Teknologi",
  "tabs.culture": "Budaya",
  "tabs.economy": "Ekonomi",
  "tabs.weather": "Cuaca",
  "tabs.mentions": "Sorotan",
  "tabs.elections": "Pemilu",
  "language.title": "Bahasa",
  "language.subtitle": "Pilih bahasa antarmuka.",
  "language.active": "Aktif",
  "auth.welcome": "Selamat datang di Sabimarket",
  "auth.google": "Lanjutkan dengan Google",
  "auth.connecting": "Menghubungkan...",
  "auth.terms": "Ketentuan",
  "auth.privacy": "Privasi",
  "home.allMarkets": "Semua pasar",
  "home.openMarket": "Pasar terbuka",
  "home.unableToLoad": "Tidak dapat memuat pasar",
  "home.retry": "Muat ulang",
  "home.tryAgain": "Coba lagi",
  "home.loadingMore": "Memuat lebih banyak pasar...",
  "home.showMore": "Tampilkan lebih banyak pasar",
  "home.market": "pasar",
  "home.markets": "pasar",
  "common.yes": "Ya",
  "common.no": "Tidak",
  "common.draw": "Seri",
};

const bn: Partial<TranslationDictionary> = {
  "nav.searchPlaceholder": "Sabimarket-এ খুঁজুন...",
  "nav.portfolio": "পোর্টফোলিও",
  "nav.cash": "ক্যাশ",
  "nav.deposit": "জমা",
  "nav.leaderboard": "লিডারবোর্ড",
  "nav.earn": "আয়",
  "nav.rooms": "রুম",
  "nav.docs": "Docs",
  "nav.darkMode": "ডার্ক মোড",
  "nav.playBetCode": "বেট কোড ব্যবহার করুন",
  "nav.builders": "বিল্ডারস",
  "nav.support": "সাপোর্ট",
  "nav.termsOfUse": "ব্যবহারের শর্তাবলি",
  "nav.language": "ভাষা",
  "nav.logOut": "লগ আউট",
  "nav.signIn": "সাইন ইন",
  "nav.signUp": "সাইন আপ",
  "nav.howItWorks": "কীভাবে কাজ করে",
  "nav.categories": "ক্যাটাগরি",
  "nav.more": "আরও",
  "tabs.trending": "ট্রেন্ডিং",
  "tabs.breaking": "ব্রেকিং",
  "tabs.new": "নতুন",
  "tabs.politics": "রাজনীতি",
  "tabs.sports": "খেলা",
  "tabs.crypto": "ক্রিপ্টো",
  "tabs.esports": "ইস্পোর্টস",
  "tabs.iran": "ইরান",
  "tabs.finance": "ফাইন্যান্স",
  "tabs.geopolitics": "ভূরাজনীতি",
  "tabs.tech": "টেক",
  "tabs.culture": "সংস্কৃতি",
  "tabs.economy": "অর্থনীতি",
  "tabs.weather": "আবহাওয়া",
  "tabs.mentions": "উল্লেখ",
  "tabs.elections": "নির্বাচন",
  "language.title": "ভাষা",
  "language.subtitle": "ইন্টারফেসের ভাষা নির্বাচন করুন।",
  "language.active": "সক্রিয়",
  "auth.welcome": "Sabimarket-এ স্বাগতম",
  "auth.google": "Google দিয়ে চালিয়ে যান",
  "auth.connecting": "সংযোগ করা হচ্ছে...",
  "auth.terms": "শর্তাবলি",
  "auth.privacy": "গোপনীয়তা",
  "home.allMarkets": "সব বাজার",
  "home.openMarket": "খোলা বাজার",
  "home.unableToLoad": "বাজার লোড করা যায়নি",
  "home.retry": "আবার লোড করুন",
  "home.tryAgain": "আবার চেষ্টা করুন",
  "home.loadingMore": "আরও বাজার লোড হচ্ছে...",
  "home.showMore": "আরও বাজার দেখুন",
  "home.market": "বাজার",
  "home.markets": "বাজার",
  "common.yes": "হ্যাঁ",
  "common.no": "না",
  "common.draw": "ড্র",
};

export const MESSAGES: Record<SupportedLocale, Partial<TranslationDictionary>> = {
  en,
  es,
  fr,
  de,
  ja,
  zh,
  id,
  bn,
};

export function translate(
  locale: SupportedLocale,
  key: TranslationKey,
  params: Record<string, string | number> = {},
): string {
  const candidate = MESSAGES[locale][key] ?? MESSAGES[DEFAULT_LOCALE][key] ?? key;

  if (typeof candidate === "function") {
    return candidate(params);
  }

  return candidate;
}
