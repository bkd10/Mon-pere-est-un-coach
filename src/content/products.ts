// Catalogue initial de la boutique. Les prix ne sont pas fixés ici : ils se saisissent dans l'administration.
export const DEFAULT_PRODUCTS = [
  { slug: "kit-premiers-pas", name: "Kit Premiers pas", tagline: "L'essentiel pour démarrer de 4 à 8 ans.", isBundle: true, ageMin: 4, ageMax: 8, sort: 0,
    contents: ["1 ballon taille 3", "6 plots", "4 cerceaux plats", "1 mini-but pliable"], equipment: ["ballon", "plots", "cerceau", "but"] },
  { slug: "kit-complet", name: "Kit Complet", tagline: "Le kit de la méthode pour les 6-13 ans. Ajoutez le rebondisseur pour les exercices de passes en solo.", isBundle: true, ageMin: 6, ageMax: 13, sort: 1,
    contents: ["1 ballon taille 4", "12 plots", "2 mini-buts pliables", "1 échelle de rythme", "4 cerceaux plats"], equipment: ["ballon", "plots", "but", "echelle", "cerceau"] },
  { slug: "kit-perfectionnement", name: "Kit Perfectionnement", tagline: "Pour les 12-18 ans qui s'entraînent seuls : passes, appuis, finition.", isBundle: true, ageMin: 12, ageMax: 18, sort: 2,
    contents: ["1 ballon taille 5", "12 plots", "1 échelle de rythme", "1 rebondisseur", "1 mini-but pliable"], equipment: ["ballon", "plots", "echelle", "mur", "but"] },
  { slug: "lot-plots", name: "Lot de 12 plots", tagline: "Le matériel le plus utilisé de la bibliothèque.", isBundle: false, ageMin: 4, ageMax: 18, sort: 10, contents: ["12 plots souples empilables"], equipment: ["plots"] },
  { slug: "mini-but", name: "Mini-but pliable", tagline: "Se monte en quelques secondes dans le jardin ou au parc.", isBundle: false, ageMin: 4, ageMax: 18, sort: 11, contents: ["1 mini-but pliable avec sac de transport"], equipment: ["but"] },
  { slug: "echelle-rythme", name: "Échelle de rythme", tagline: "Appuis, coordination et échauffements.", isBundle: false, ageMin: 6, ageMax: 18, sort: 12, contents: ["1 échelle de rythme"], equipment: ["echelle"] },
  { slug: "rebondisseur", name: "Rebondisseur", tagline: "Un partenaire de passes toujours disponible.", isBundle: false, ageMin: 8, ageMax: 18, sort: 13, contents: ["1 rebondisseur pliable"], equipment: ["mur"] },
  { slug: "cerceaux", name: "Lot de 4 cerceaux plats", tagline: "Cibles et zones d'appui au sol.", isBundle: false, ageMin: 4, ageMax: 12, sort: 14, contents: ["4 cerceaux plats de couleurs"], equipment: ["cerceau"] },
];
