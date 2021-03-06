﻿import {LayoutView} from 'marionette';
import playPauseButtonTemplate from 'template/streamControlBar/playPauseButton.hbs!';
import pauseIconTemplate from 'template/icon/pauseIcon_30.hbs!';
import playIconTemplate from 'template/icon/playIcon_30.hbs!';

var PlayPauseButtonView = LayoutView.extend({
  id: 'playPauseButton',
  className: 'button button--icon button--icon--primary button--large',
  template: playPauseButtonTemplate,

  templateHelpers: {
    pauseIcon: pauseIconTemplate,
    playIcon: playIconTemplate
  },

  ui: {
    playIcon: 'playIcon',
    pauseIcon: 'pauseIcon'
  },

  events: {
    'click': '_onClick'
  },

  modelEvents: {
    'change:enabled': '_onChangeEnabled'
  },

  player: null,

  initialize: function(options) {
    this.player = options.player;
    this.listenTo(this.player, 'change:state', this._onPlayerChangeState);

    this.listenTo(StreamusFG.channels.playPauseButton.commands, 'tryToggle:playerState', this._tryTogglePlayerState);
  },

  onRender: function() {
    this._setState(this.model.get('enabled'));
  },

  _onClick: function() {
    this._tryTogglePlayerState();
  },

  _tryTogglePlayerState: function() {
    this.model.tryTogglePlayerState();
  },

  _onChangeEnabled: function(model, enabled) {
    this._setState(enabled, this.player.get('state'));
  },

  _onPlayerChangeState: function() {
    this._setState(this.model.get('enabled'));
  },

  _setState: function(enabled) {
    this.$el.toggleClass('is-disabled', !enabled);

    var isPausable = this.player.isPausable();
    this.ui.pauseIcon.toggleClass('is-hidden', !isPausable);
    this.ui.playIcon.toggleClass('is-hidden', isPausable);
  }
});

export default PlayPauseButtonView;