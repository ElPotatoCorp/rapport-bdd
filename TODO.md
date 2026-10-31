# TODO — report-maker

## Compilation / script

- [x] Plugin remark qui numérote automatiquement les \<h1>-\<h6> (1, 1.1, 1.2, 2, 2.1...)
- [x] Génération d'un `export const toc = [...]` directement dans le module MDX compilé
- [x] Slugs stables + uniques pour les ancres (`#section-name`)
- [x] Trois modes de build : `folder`, `singlefile`, `hybrid`
- [x] Logique d'exclusion d'assets (extension, taille d'image) pour le mode hybride
- [x] Endpoint dev `/api/export` prêt à être appelé par un bouton (build déclenché en arrière-plan)

## Composants

- [ ] Project (ReportMaker)
    - [x] Logo + Icon
    - [x] Colors
    - [ ] Sort style.css
        - [ ] Split component css from global css
        - [ ] Remove unused style
        - [ ] Rename styles for more coherant names
    - [ ] A report that explains how to use report-maker, made by the very same tool XD
- [x] `<Header">`
- [x] `<CoverPage>`
- [x] `<Separator/>`
- [x] Headings styles (h3, h4, h5, etc.)
- [x] `<TableOfContents items={toc} />`
- [ ] `<Collapsible title="...">`
    - [ ] Fix inner collapsible arrow animation not working
- [x] `<Tabs/>`
    - [x] `<BeforeAfter before="..." after="..." />`
- [x] `<Figure src="..." caption="..." />`
    - [x] figure numbering
    - [x] Zoom
- [x] `<Callout type="info|warning|note|...">`
- [ ] `<Code type="inline|bloc">`
    - [x] File name + language indicator
    - [x] Easy copy
    - [ ] Fix Shiki embedding every themes or languages on build (making it past 15MB for something as simple as text)
- [x] `<ExportPanel>` : toggle folder/singlefile/hybrid + checkboxes (exclure gifs, vidéos, images > X px)
    - [ ] Pannel style
    - [x] folder
    - [x] singlefile
    - [ ] hybrid
        - [ ] Détection poids des assets, filtre par taille, qualité, etc.
        - [ ] exclusion individuelle de fichiers
- [x] Top link
- [x] Light mode / dark mode
- [ ] `<ThemePanel>`
    - [x] CSS var edition
    - [x] preview
    - [ ] Pannel style
    - [x] Select shiki theme
