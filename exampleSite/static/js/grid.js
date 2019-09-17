// ======================= imagesLoaded Plugin ===============================
// https://github.com/desandro/imagesloaded

// $('#my-container').imagesLoaded(myFunction)
// execute a callback when all images have loaded.
// needed because .load() doesn't work on cached images

// callback function gets image collection as argument
//  this is the container

// original: MIT license. Paul Irish. 2010.
// contributors: Oren Solomianik, David DeSandro, Yiannis Chatzikonstantinou

// blank image data-uri bypasses webkit log warning (thx doug jones)
var BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

$.fn.imagesLoaded = function( callback ) {
    var $this = this,
        deferred = $.isFunction($.Deferred) ? $.Deferred() : 0,
        hasNotify = $.isFunction(deferred.notify),
        $images = $this.find('img').add( $this.filter('img') ),
        loaded = [],
        proper = [],
        broken = [];

    // Register deferred callbacks
    if ($.isPlainObject(callback)) {
        $.each(callback, function (key, value) {
            if (key === 'callback') {
                callback = value;
            } else if (deferred) {
                deferred[key](value);
            }
        });
    }

    function doneLoading() {
        var $proper = $(proper),
            $broken = $(broken);

        if ( deferred ) {
            if ( broken.length ) {
                deferred.reject( $images, $proper, $broken );
            } else {
                deferred.resolve( $images );
            }
        }

        if ( $.isFunction( callback ) ) {
            callback.call( $this, $images, $proper, $broken );
        }
    }

    function imgLoaded( img, isBroken ) {
        // don't proceed if BLANK image, or image is already loaded
        if ( img.src === BLANK || $.inArray( img, loaded ) !== -1 ) {
            return;
        }

        // store element in loaded images array
        loaded.push( img );

        // keep track of broken and properly loaded images
        if ( isBroken ) {
            broken.push( img );
        } else {
            proper.push( img );
        }

        // cache image and its state for future calls
        $.data( img, 'imagesLoaded', { isBroken: isBroken, src: img.src } );

        // trigger deferred progress method if present
        if ( hasNotify ) {
            deferred.notifyWith( $(img), [ isBroken, $images, $(proper), $(broken) ] );
        }

        // call doneLoading and clean listeners if all images are loaded
        if ( $images.length === loaded.length ){
            setTimeout( doneLoading );
            $images.unbind( '.imagesLoaded' );
        }
    }

    // if no images, trigger immediately
    if ( !$images.length ) {
        doneLoading();
    } else {
        $images.bind( 'load.imagesLoaded error.imagesLoaded', function( event ){
            // trigger imgLoaded
            imgLoaded( event.target, event.type === 'error' );
        }).each( function( i, el ) {
            var src = el.src;

            // find out if this image has been already checked for status
            // if it was, and src has not changed, call imgLoaded on it
            var cached = $.data( el, 'imagesLoaded' );
            if ( cached && cached.src === src ) {
                imgLoaded( el, cached.isBroken );
                return;
            }

            // if complete is true and browser supports natural sizes, try
            // to check for image status manually
            if ( el.complete && el.naturalWidth !== undefined ) {
                imgLoaded( el, el.naturalWidth === 0 || el.naturalHeight === 0 );
                return;
            }

            // cached images don't fire load sometimes, so we reset src, but only when
            // dealing with IE, or image is complete (loaded) and failed manual check
            // webkit hack from http://groups.google.com/group/jquery-dev/browse_thread/thread/eee6ab7b2da50e1f
            if ( el.readyState || el.complete ) {
                el.src = BLANK;
                el.src = src;
            }
        });
    }

    return deferred ? deferred.promise( $this ) : $this;
};

// == now my code ==

var Grid = (function() {
    var $selector = '#og-grid',
        $grid = $($selector),
        $items = $grid.children('li'),
        current = -1,
        previewPosition = -1,
        scrollExtra = 0,
        marginExpanded = 10,
        $window = $(window), winSize,
        $body = $('html, body'),
        transEndEventNames = {
            'WebkitTransition' : 'webkitTransitionEnd',
            'MozTransition' : 'transitionend',
            'OTransition' : 'oTransitionEnd',
            'msTransition' : 'MSTransitionEnd',
            'transition' : 'transitionend'
        },
        transEndEventName = transEndEventNames[Modernizr.prefixed( 'transition')],
        support = Modernizr.csstransitions,
        settings = {
            minHeight : 500,
            speed : 250,
            easing : 'ease'
        };

    function init(config) {
        settings = $.extend(true, {}, settings, config);

        $grid.imagesLoaded(function () {
            saveItemInfo(true);
            getWinSize();
            initEvents();
        });
    }

    function addItems($newItems) {
        $items = $items.add($newItems);
        $newItems.each(function() {
           var $item = $(this);
           $item.data({
              offsetTop : $item.offset().top,
              height : $item.height()
           });
        });
        initItemsEvents($newItems);
    }

    function saveItemInfo(saveHeight) {
        $items.each(function() {
            var $item = $(this);
            $item.data('offsetTop', $item.offset().top);

            if (saveHeight) {
                $item.data('height', $item.height());
            }

        });
    }

    function initEvents() {
        initItemsEvents($items);

        $window.on('debouncedresize', function() {
            scrollExtra = 0;
            previewPosition = -1;

            saveItemInfo();
            getWinSize();
            var preview = $.data(this, 'preview');
            if (typeof preview != 'undefined') {
                hidePreview();
            }
        });
    }

    function initItemsEvents($items) {
        $items.on('click', 'span.og-close', function() {
           hidePreview();
           return false;
        }).children('a').on('click', function(e) {
            var $item = $(this).parent();
            current === $item.index() ? hidePreview() : showPreview($item);
            return false;
        });
    }

    function getWinSize() {
        winSize = {
            width: $window.width(),
            height: $window.height()
        };
    }

    function showPreview($item) {
        var preview = $.data(this, 'preview'),
            position = $item.data('offsetTop');

        scrollExtra = 0;

        if (typeof preview !== 'undefined') { // this block needs to be refactored to be more readable
            if (previewPosition != position) {
                if (position > previewPosition) {
                    scrollExtra = preview.height;
                }
                hidePreview();
            } else {
                preview.update($item);
                return false;
            }
        }

        previewPosition = position;
        preview = $.data(this, 'preview', new Preview($item));
        preview.open();
    }

    function hidePreview() {
        current = -1;
        var preview = $.data(this, 'preview');
        preview.close();
        $.removeData(this, 'preview');
    }

    function Preview($item) {
        this.$item = $item;
        this.expandedIndex = this.$item.index();
        this.create();
        this.update();
    }

    Preview.prototype = {
        create : function() {
            this.$title = $('<h3></h3>');
            this.$description = $('<p></p>');
            this.$mediums = $('<p></p>');
            this.$dimensions = $('<p></p>');
            this.$details = $('<div class="og-details"></div>').append(this.$title, this.$description, this.$mediums, this.$dimensions);
            this.$loading = $('<div class="og-loading"></div>');
            this.$fullimage = $('<div class="og-fullimg"></div>').append(this.$loading);
            this.$closePreview = $('<span class="og-close"></span>');
            this.$previewInner = $('<div class="og-expander-inner"></div>').append(this.$closePreview, this.$fullimage, this.$details);
            this.$previewElement = $('<div class="og-expander"></div>').append(this.$previewInner);

            this.timout = 25;

            this.$item.append(this.getElement());

            if (support) {
                this.setTransition();
            }

        },
        update : function($item) {

            if ($item) {
                this.$item = $item;
            }

            if (current !== -1) {
                var $currentItem = $items.eq(current);
                $currentItem.removeClass('og-expanded');
                this.$item.addClass('og-expanded');
                this.positionPreview();
            }

            current = this.$item.index();

            var $itemElement = this.$item.children('a'),
                elementData = {
                    largesrc : $itemElement.data('largesrc'),
                    title : $itemElement.data('title'),
                    description : $itemElement.data('description'),
                    mediums : $itemElement.data('mediums'),
                    dimensions : $itemElement.data('dimensions')
                };

            this.$title.html(elementData.title);
            this.$description.html(elementData.description);
            this.$mediums.html(elementData.mediums);
            this.$dimensions.html(elementData.dimensions);

            var self = this;

            if (typeof self.$largeImg != 'undefined') {// change name to largeSrc
                self.$largeImg.remove();
            }

            if (self.$fullimage.is(':visible')) {
                this.$loading.show();
                $('<img/>').load( function() {
                    var $img = $(this);

                    if ($img.attr('src') === self.$item.children('a').data('largesrc') ) {
                        self.$loading.hide();
                        self.$fullimage.find('img').remove();
                        self.$largeImg = $img.fadeIn(350);
                        self.$fullimage.append(self.$largeImg);
                    }

                } ).attr('src', elementData.largesrc);
            }
        },
        open : function() {
            setTimeout($.proxy(function() {
                this.setHeight();
                this.positionPreview();
            }, this), this.timeout)
        },
        close : function() {
            var self = this,
                onEndFn = function() { // good got rename this function!
                    if( support ) {
                        $(this).off(transEndEventName);
                    }
                    self.$item.removeClass('og-expanded');
                    self.$previewElement.remove();
                };

            setTimeout($.proxy( function() {

                if (typeof this.$largeImg !== 'undefined') {
                    this.$largeImg.fadeOut( 'fast' );
                }

                this.$previewElement.css('height', 0);
                var $expandedItem = $items.eq(this.expandedIndex);
                $expandedItem.css('height', $expandedItem.data('height')).on(transEndEventName, onEndFn);

                if (!support) {
                    onEndFn.call();
                }

            }, this ), this.timout);

            return false;
        },
        getHeight : function() {
            var previewHeight = winSize.height - this.$item.data('height') - marginExpanded,
                itemHeight = winSize.height;

            if (previewHeight < settings.minHeight) {
                previewHeight = settings.minHeight;
                itemHeight = settings.minHeight + this.$item.data( 'height' ) + marginExpanded;
            }

            this.height = previewHeight;
            this.itemHeight = itemHeight;
        },
        setHeight : function() {
            var self = this,
                onEndFn = function() {

                    if (support) {
                        self.$item.off(transEndEventName);
                    }

                    self.$item.addClass('og-expanded');
                };

            this.getHeight();
            this.$previewElement.css('height', this.height);
            this.$item.css('height', this.itemHeight).on(transEndEventName, onEndFn);

            if (!support) {
                onEndFn.call();
            }
        },
        positionPreview : function() {
            var position = this.$item.data( 'offsetTop' ),
                previewOffsetTop = this.$previewElement.offset().top - scrollExtra,
                scrollValue = this.height + this.$item.data( 'height' ) + marginExpanded <= winSize.height ? position : this.height < winSize.height ? previewOffsetTop - ( winSize.height - this.height ) : previewOffsetTop;

            $body.animate({scrollTop : scrollValue}, settings.speed);
        },
        setTransition : function() {
            this.$previewElement.css('transition', 'height ' + settings.speed + 'ms ' + settings.easing);
            this.$item.css('transition', 'height ' + settings.speed + 'ms ' + settings.easing);
        },
        getElement : function() {
            return this.$previewElement;
        }
    }

    return {
        init : init,
        addItems : addItems
    };

})();