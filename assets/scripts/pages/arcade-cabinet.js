window.addEventListener('DOMContentLoaded', function () {
  window.ClassicGamesHubArcade.initCabinet({
    canvasSelector: '#arcadeCanvas',
    titleSelector: '#cabinetTitle',
    categorySelector: '#cabinetCategory',
    descriptionSelector: '#cabinetDescription',
    thumbSelector: '#cabinetThumb',
    controlsSelector: '#controlsList',
    settingsFormSelector: '#settingsForm',
    settingsNoteSelector: '#settingsNote',
    applySettingsSelector: '#applySettingsButton',
    defaultSettingsSelector: '#defaultSettingsButton',
    touchCardSelector: '#touchCard',
    touchPadSelector: '#touchPad',
    touchNoteSelector: '#touchNote',
    overlaySelector: '#overlay',
    overlayTitleSelector: '#overlayTitle',
    overlayTextSelector: '#overlayText',
    overlayButtonSelector: '#overlayButton',
    pauseSelector: '#pauseButton',
    restartSelector: '#restartButton',
    statusSelector: '#statusLine',
    metricSelectors: [
      { label: '#metric1Label', value: '#metric1Value' },
      { label: '#metric2Label', value: '#metric2Value' },
      { label: '#metric3Label', value: '#metric3Value' },
      { label: '#metric4Label', value: '#metric4Value' }
    ]
  });
});
