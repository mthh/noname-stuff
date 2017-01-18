Discrétisation
===================

Plusieurs méthodes sont proposées afin de transformer une série continue de valeurs en une série discrète, c'est à dire en un nombre fini de classes. Le nombre de classes ainsi que les valeurs limites de ces classes doivent être justifiées sémantiquement et/ou statistiquement.

Les méthodes proposées par l'outil peuvent être utilisées telles quelles ou bien comme des guides de lecture et d'analyse préalables à la saisie manuelle des limites de classes souhaitées.

----------


- Intervalles égaux
Cette méthode, parfois également appelées "amplitudes égale", permet de créer des classes qui possèdent toutes la même étendue.


- Quantiles
Cette méthode, parfois également décrite par le terme de "discrétisation en classes d'effectifs égaux" permet de former des classes qui possèdent toutes le même nombre d'individus.


- Q6
Cette méthode originale, notamment démocratisée par l'outil PhilCarto [1], permet d'effectuer une discrétisation selon la méthode des quartiles tout en isolant les valeurs extrèmes.


- Seuils naturels (algorithme de Jenks [2])
Cette méthode permet de créer des classes homogènes. En effet l'algorithme vise à trouver le nombre de classe souhaitées en minimisant la variance intra-classe et en maximisant la variance inter-classe.


- Il est également possible d'utiliser les discrétisations en progression arithmétique ou géométrique ou de saisir manuellement les bornes de classes. 


  [1]: (http://philcarto.free.fr/)
  [2]: (https://en.wikipedia.org/wiki/Jenks_natural_breaks_optimization)