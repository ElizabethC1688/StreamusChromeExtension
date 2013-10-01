﻿//  Represents the videos in a given playlist
define([
    'contextMenuView',
    'streamItems',
    'playlistItemView',
    'utility'
], function (ContextMenuView, StreamItems, PlaylistItemView, Utility) {
    'use strict';

    var ActivePlaylistItemsView = Backbone.View.extend({
        
        className: 'left-list',

        template: _.template($('#activePlaylistItemsTemplate').html()),
        
        events: {
            'contextmenu': 'showContextMenu',
            'contextmenu .playlistItem': 'showItemContextMenu',
            'click .playlistItem': 'addItemToStream'
        },
        
        attributes: {
            'id': 'activePlaylistItemsView'
        },
            
        render: function () {
            this.$el.html(this.template(
                _.extend(this.model.toJSON(), {
                    //  Mix in chrome to reference internationalize.
                    'chrome.i18n': chrome.i18n
                })
            ));

            var firstItemId = this.model.get('firstItemId');

            var playlistItems = this.model.get('items');
            
            if (playlistItems.length > 0) {

                var playlistItem = playlistItems.get(firstItemId);

                console.log("this.model and playlistItem:", this.model, playlistItem);

                //  Build up the views for each playlistItem.
                var items = [];
                do {

                    var playlistItemView = new PlaylistItemView({
                        model: playlistItem
                    });

                    var element = playlistItemView.render().el;
                    items.push(element);

                    var nextItemId = playlistItem.get('nextItemId');
                    playlistItem = playlistItems.get(nextItemId);

                } while (playlistItem && playlistItem.get('id') !== firstItemId)

                //  Do this all in one DOM insertion to prevent lag in large playlists.
                this.$el.append(items);

                this.$el.find('img.lazy').lazyload({
                    effect: 'fadeIn',
                    container: this.$el,
                    event: 'scroll manualShow'
                });
                
            }

            return this;
        },
        
        initialize: function() {

            var self = this;
            
            //  Allows for drag-and-drop of videos
            this.$el.sortable({
                axis: 'y',
                //  Adding this helps prevent unwanted clicks to play
                delay: 100,
                cancel: '.big-text',
                //  Whenever a video row is moved inform the Player of the new video list order
                update: function (event, ui) {

                    var movedItemId = ui.item.data('itemid');
                    var newIndex = ui.item.index();
                    var nextIndex = newIndex + 1;

                    console.log("self == this?", self == this);

                    var nextItem = self.$el.find('item:eq(' + nextIndex + ')');

                    if (nextItem == null) {
                        nextItem = self.$el.find('item:eq(0)');
                    }

                    var nextItemId = nextItem.data('itemid');

                    self.model.moveItem(movedItemId, nextItemId);
                }
            });

            this.startListeningToItems(this.model.get('items'));

            Utility.scrollChildElements(this.el, 'span.playlistItemTitle');
        },
        
        changeModel: function(newModel) {
          
            this.stopListening(this.model.get('items'));

            this.model = newModel;
            this.startListeningToItems(newModel.get('items'));

            this.render();
        },

        startListeningToItems: function (playlistItems) {
            this.listenTo(playlistItems, 'add', this.addItem);
            this.listenTo(playlistItems, 'empty', this.render);
            this.listenTo(playlistItems, 'remove', function () {
                //  Trigger a manual show because an item could slide into view and need to load it.
                this.$el.trigger('manualShow');
            });
        },
        
        addItem: function (playlistItem) {

            var playlistItemView = new PlaylistItemView({
                model: playlistItem
            });

            var element = playlistItemView.render().$el;

            if (this.$el.find('item').length > 0) {

                var previousItemId = playlistItem.get('previousItemId');

                var previousItem = this.$el.find('item[data-itemid="' + previousItemId + '"]');
                element.insertAfter(previousItem);

            } else {
                element.appendTo(this.$el);
            }
            
            element.find('img.lazy').lazyload({
                effect: 'fadeIn',
                container: this.$el,
                event: 'scroll manualShow'
            });

            this.emptyNotification.hide();
            this.scrollItemIntoView(playlistItem);
        },
        
        showContextMenu: function (event) {
            var self = this;

            var isAddPlaylistDisabled = this.model.get('items').length === 0;

            ContextMenuView.addGroup({
                position: 0,
                items: [{
                    position: 0,
                    text: chrome.i18n.getMessage("addPlaylistToStream"),
                    disabled: isAddPlaylistDisabled,
                    title: isAddPlaylistDisabled ? chrome.i18n.getMessage("addPlaylistNoAddStreamWarning") : '',
                    onClick: function () {

                        if (!isAddPlaylistDisabled) {
                            
                            var streamItems = self.model.get('items').map(function (playlistItem) {
                                return {
                                    id: _.uniqueId('streamItem_'),
                                    video: playlistItem.get('video'),
                                    title: playlistItem.get('title'),
                                    videoImageUrl: 'http://img.youtube.com/vi/' + playlistItem.get('video').get('id') + '/default.jpg'
                                };
                            });

                            StreamItems.addMultiple(streamItems);
                            
                        }

                    }
                }]
            });

            ContextMenuView.show({
                top: event.pageY,
                left: event.pageX + 1
            });

            return false;
        },
        
        showItemContextMenu: function (event) {

            console.log("showcontextMenu");

            var clickedItemId = $(event.currentTarget).data('itemid');
            var clickedItem = this.model.get('items').get(clickedItemId);

            var self = this;
            ContextMenuView.addGroup({
                position: 0,
                items: [{
                    position: 0,
                    text: chrome.i18n.getMessage("copyUrl"),
                    onClick: function () {
                        chrome.extension.sendMessage({
                            method: 'copy',
                            text: 'http://youtu.be/' + clickedItem.get('video').get('id')
                        });
                    }
                }, {
                    position: 1,
                    text: chrome.i18n.getMessage("copyTitleAndUrl"),
                    onClick: function () {

                        chrome.extension.sendMessage({
                            method: 'copy',
                            text: '"' + clickedItem.get('title') + '" - http://youtu.be/' + clickedItem.get('video').get('id')
                        });
                    }
                }, {
                    position: 2,
                    text: chrome.i18n.getMessage("deleteVideo"),
                    onClick: function () {
                        clickedItem.destroy();
                    }
                }, {
                    position: 3,
                    text: chrome.i18n.getMessage("addVideoToStream"),
                    onClick: function () {
                        StreamItems.add({
                            id: _.uniqueId('streamItem_'),
                            video: clickedItem.get('video'),
                            title: clickedItem.get('title'),
                            videoImageUrl: 'http://img.youtube.com/vi/' + clickedItem.get('video').get('id') + '/default.jpg'
                        });
                    }
                }]

            });

            ContextMenuView.addGroup({
                position: 1,
                items: [{
                    position: 0,
                    text: chrome.i18n.getMessage("addPlaylistToStream"),
                    onClick: function () {

                        var streamItems = self.model.get('items').map(function (playlistItem) {
                            return {
                                id: _.uniqueId('streamItem_'),
                                video: playlistItem.get('video'),
                                title: playlistItem.get('title'),
                                videoImageUrl: 'http://img.youtube.com/vi/' + playlistItem.get('video').get('id') + '/default.jpg'
                            };
                        });

                        StreamItems.addMultiple(streamItems);

                    }
                }]
            });

            ContextMenuView.show({
                top: event.pageY,
                left: event.pageX + 1
            });

            return false;
        },
        
        addItemToStream: function (event) {
            
            //  Add item to stream on dblclick.
            var itemId = $(event.currentTarget).data('itemid');
            var playlistItem = this.model.getPlaylistItemById(itemId);

            StreamItems.add({
                id: _.uniqueId('streamItem_'),
                video: playlistItem.get('video'),
                title: playlistItem.get('title'),
                videoImageUrl: 'http://img.youtube.com/vi/' + playlistItem.get('video').get('id') + '/default.jpg'
            });
            
        },
        
        scrollItemIntoView: function(item) {
            var itemId = item.get('id');
            var activeItem = this.$el.find('.playlistItem[data-itemid="' + itemId + '"]');

            if (activeItem.length > 0) {
                activeItem.scrollIntoView(true);
            }
        }
        
    });

    return ActivePlaylistItemsView;
});