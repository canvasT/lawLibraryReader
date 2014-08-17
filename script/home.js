window.MSA.Home = MSA.Class({
    init: function(data){
        this.page = data.page;
        this.$p = $(this.page);
        this.$categoryListCont = this.$p.find('.js-category-list');
        this.$articleListCont = this.$p.find('.js-aritcle-list');
        this.$listCont = this.$p.find('.js-list-cont');
        this.$formSearch = this.$p.find('.js-form-search');
        this.$btnSearch = this.$p.find('.js-btn-search');
        this.$btnMenu = this.$p.find('.js-btn-menu');
        this.$loading = this.$p.find('.js-loading');
        this.$btnConfirmSearch = this.$p.find('.js-btn-confirm-search');
        this.$iptSearch = this.$p.find('.js-ipt-search');
        this.$appContent = this.$p.find('.app-content');
        this.initData();
        this.initDom();
        this.initEvent();
    },

    initData: function(){
        var that = this;
        this.startIndex = 0;
        this.categoryId = 0;
        this.articleList = MSA.List.getArticles();
        this.categories = MSA.List.getCategories();
    },

    initDom: function(){
        this.initCategory();
        // this.initArticleList();
    },

    initEvent: function(){
        var that = this;
        $p = this.$p;
        $formSearch = this.$formSearch;
        $btnSearch = this.$btnSearch;
        $btnMenu = this.$btnMenu;

        $btnSearch.on('click', function(){
            $searchBtn = $(this);
            if($searchBtn.hasClass('selected')){
                $searchBtn.removeClass('selected');
                $formSearch.hide();
            }else{
                $searchBtn.addClass('selected');
                $formSearch.show();
            }
        })

        $p.on('click', 'li.js-item', function(e){
            e.isPropagationStopped()
            $item = $(this);
            App.load('detail');
        })
        
        $btnMenu.on('touchend', function(e){
            if(that.$listCont.hasClass('move-left')){
                that.$listCont.removeClass('move-left');
            }else{
                that.$listCont.addClass('move-left');
            }
            e.preventDefault();
        })

        $p.on('click', 'li.js-menu-item', function(){
            var $this = $(this);
            var categoryName = $(this).text();
            var categoryId = $(this).attr('data-id');
            that.$categoryListCont.find('.menu-item.selected').removeClass('selected');
            $this.addClass('selected');
            that.$listCont.removeClass('move-left');
            that.$p.find('.app-title').text(categoryName);
            that.showArticlesForCategory(categoryId);
        });

        this.$btnConfirmSearch.on('click', function(){
            var keyWord = that.$iptSearch.val();

            App.load('search', {
                keyWord: keyWord
            });
        })
        this.loadDocuments();
    },

    initCategory: function(){
        var that = this;
        this.$categoryListCont.html('');

        function getCategoryItems(items){
            var list = [];
            for(var i = 0, len = items.length; i < len; i++ ){
                var item = items[i];
                if(item.children != undefined && item.children.length > 0){
                    list = list.concat(getCategoryItems(item.children));
                }else{
                    list.push({
                        id: item.id,
                        name: item.name
                    });
                }
            }
            return list;
        }

        sql.listCategory().done(function(_res){
            that.categories = getCategoryItems(_res);
            $.each(that.categories, function(i, o){
                if(o.name){
                    that.$categoryListCont.append('<li class="menu-item js-menu-item" data-index="' + i + '" data-id="' + o.id + '">' + o.name + '</li>');
                }
            })
        })     
    },

    showArticlesForCategory: function(categoryId){
        var that = this;
        that.categoryId = categoryId;
        that.startIndex = 0;
        that.$articleListCont.html('');
        that.$formSearch.hide();
        that.$iptSearch.val('');
        that.$btnSearch.removeClass('selected');
        that.$appContent.scroll();
    },

    loadDocuments: function(){
        var that = this;
        App.infiniteScroll(that.$articleListCont[0], { loading: that.$loading[0] }, function (next) {
            var params = {
                start: that.startIndex
            };
            if(that.categoryId){
                params.cat = that.categoryId;
            }
            sql.listDocuments(params).done(function(_res){
                var htmlList = [];
                $.each(_res, function(i, o){
                    if(o.title){
                        htmlList.push('<li class="js-item" data-id="' + o.id + '">' + o.title + '</li>');
                    }
                })
                that.startIndex += htmlList.length;
                next(htmlList);
            });
        });
    }

});

App.controller('home', function (page) {
    var home = new MSA.Home({
        page: page
    });
});