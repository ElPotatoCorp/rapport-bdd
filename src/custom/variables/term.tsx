import { addTerm, easyTerm } from '../../helpers/easy-term';

// Scripting & Versioning
addTerm('release', <>Une version stable, visible par tout le monde.</>);
addTerm('draft', <>Un brouillon : une version en cours de travail, pas encore prête à être publiée.</>);
addTerm('bloated', <>Surchargé de fonctionnalités dont on ne se servira jamais.</>);
addTerm('repository', <>Le dépôt : ce qui contient un projet et tout son historique.</>);
addTerm('commit', <>Un instantané du contenu à un moment donné, auquel on peut revenir plus tard.</>);
addTerm('revert', <>Annuler un {easyTerm('commit')} en créant un nouveau commit qui défait ses changements.</>);
addTerm('tag', <>Une étiquette posée sur un {easyTerm('commit')} précis, par exemple pour marquer une {easyTerm('release')}.</>);

// Optimisation & Performance
addTerm('blob', <>Binary Large OBject : un fichier stocké une seule fois, identifié par son hash.</>);
addTerm('hashage', <>Transformer un contenu en une empreinte de taille fixe : le même contenu donne toujours la même empreinte.</>);
addTerm('SHA-256', <>Un algorithme de hashage qui donne une empreinte de 256 bits. MD5 n'en donne que 128 et n'est plus considéré comme fiable.</>);
addTerm('checksum', <>Le résultat du {easyTerm('hashage')} : l'empreinte du contenu.</>);
addTerm('compteur de références', <>Le nombre de {easyTerm('commit', 'commits')} qui utilisent ce fichier.</>);
addTerm('index', <>Un raccourci que la base tient à jour pour retrouver des lignes sans parcourir toute la table.</>);
addTerm('index partiel', <>Un {easyTerm('index')} qui ne couvre que les lignes qui remplissent une condition, donc plus petit et plus rapide.</>);

// Simulation
addTerm('SAÉ', <>Situation d'Apprentissage et d'Évaluation.</>);
addTerm('rétrocompatibilité', <>Faire en sorte que ce qui a été créé avec une ancienne version continue de fonctionner.</>);
addTerm('soft delete', <>Suppression « douce » : la ligne reste en base, simplement marquée comme supprimée via une date.</>);

// IndexedDB
addTerm('IndexedDB', <>Une base de données intégrée au navigateur, qui reste stockée sur l'appareil de l'utilisateur.</>);
addTerm('cache', <>Une copie temporaire gardée en local, pour ne pas tout perdre ni tout recharger.</>);
addTerm('debounce', <>On attend que l'utilisateur arrête de taper pendant un court instant avant de sauvegarder, au lieu de le faire à chaque touche.</>);
addTerm('diff', <>L'affichage des différences entre deux versions d'un même contenu.</>);
addTerm('timeout', <>Le serveur met trop de temps à répondre, donc on abandonne.</>);

// Confidentialité & RGPD
addTerm('RGPD', <>Règlement Général sur la Protection des Données.</>);
addTerm('anonymisé', <>Les données ne permettent plus, même indirectement, d'identifier la personne.</>);
