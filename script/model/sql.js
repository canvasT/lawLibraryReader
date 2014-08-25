/**
 * 持久化数据层
 */

(function(exports,$){
    var PAGESIZE = 20,
    	gIsDirty = false;
    	// 是否需要更新
    var flag = new Lawnchair({name:'tb_flag'}, function(store) { });
    // creat a new db
    var store = new Lawnchair({name:'tb_categories'}, function(store) {
        // 预加载 文档分类数据；
        // 保存
        // fetchCategorys(function(_res){
        //  store.save(_res);
        // });
        
    });
    var documentStore = new Lawnchair({name:'tb_documents'}, function(store) {});
    var detailStore = new Lawnchair({name:'tb_docu_details'}, function(store) {});

    // get category list
    function fetchCategorys(_callback){
        $.ajax({
            url:'http://www.nbmsa.gov.cn/api/law_documents/categories/',
            success : function(_result){
            	var documentCount = 0;
            	var mix = function(_val){
            		documentCount += _val.docs_amount;
            		return {
                		name : _val.name,
                		id : _val.id,
                		docs_amount : _val.docs_amount,
                		children : []
                	};
            	};
            	var newlist = [];
            	$.each(_result,function( _index, _val,_this){
                	newlist.push(mix(_val));
					// 将多级的数据改为一级
                	$.each(_val.children,function(_index2, _item2){
                		newlist.push(mix(_item2));
                		// Max depth is level2
                	});
                });
                var me = {key:'categories',data: newlist};
                _callback(me);
                //
                //TODO strip unused properties
                store.save(me);
                //check dirty
                flag.get('total',function(_res){
                	// not reliable
                	if(_res && _res.data.total!= documentCount){
                		gIsDirty = true;
                	}
                	//
	                flag.save({
	                	key:'total',
	                	data :{
	                		time : new Date().getTime(),
	                		total : newlist.length
	                	}
	                });
                });
            }
        });
    }
    // get documents list of one category
    function fetchDocuments(_param, _callback){
        var data = {
            start : parseInt(_param.start,10) || 0,
            cat : _param.cat,
            num : parseInt(_param.num,10) || PAGESIZE
        };
        
        //no hit
        $.getJSON('http://www.nbmsa.gov.cn/api/law_documents/documents/',data,function(_res){
            var ley = 'documents'+data.cat;
            var mixed = $.map(_res,function(_val, _index, _this){
	                	return {
	                		id : _val.id,
	                		title : _val.title,
	                		category : _val.category
	                	}
	                });
            _callback({key:ley,data:mixed});
            //
            documentStore.get(ley,function(older){
                //
                if(older && older.data){
                    var newer = older;
                }else{
                    var newer = {key:ley,data:[]};
                }
                for(var i= 0, l = mixed.length; i<l; i++){
                    var artice = mixed[i];
                    newer.data[data.start+i] = artice;
                }
                try{
                    //TODO strip unused properties
                    documentStore.save(newer);
                }catch(e){
                    alert('数据离线失败');
                }
                
            })
        });
            
        
    }
    // search
    function searchDocuments(_param, _callback){
        var data = {
            start : parseInt(_param.start,10) || 0,
            num : parseInt(_param.num,10) || PAGESIZE
        };
        if(_param.keyword){
            data.keyword = _param.keyword;
        }
        $.getJSON(
            'http://www.nbmsa.gov.cn/api/law_documents/search/',
            data,
            function(_res){
                _callback(_res);
            }
        );
        //TODO  search in cache
    };

    function offlineSearch(_param, _callback){
    	var data = {
            start : parseInt(_param.start,10) || 0,
            num : parseInt(_param.num,10) || PAGESIZE
        };
        if(_param.keyword){
            data.keyword = _param.keyword;
        }
        //
        var def = $.Deferred(),
        	outs = [];
        store.get('categories',function(_res){
        	var lst = _res.data;
        	var maxLoop = lst.length,
        		starter = 0 ;
        	for (var i = maxLoop - 1; i >= 0; i--) {
        		var category = lst[i];
        		var ley = 'documents'+category.id;
        		documentStore.get(ley,function(_res){
        			if(_res.title.indexOf(data.keyword)>-1){
        				outs.push(_res);
        			}
        			starter++;
        			if(starter > maxLoop){
        				def.resolve(outs);
        			}
        		})
        	};
        })
        return def;
    }
    function getHTMLById(_id, _callback){
        
        $.getJSON(
            'http://www.nbmsa.gov.cn/api/law_documents/document/'+_id+'/',
            {},
            function(_res){
                try{
                    var val = {
                        key : ''+_id,
                        data : _res
                    };
                    _callback(val);
                    //
                    detailStore.save(val);
                }catch(e){
                    alert('数据离线失败');
                }
            }
        );
    }
// fetch detail by document id
    function fetchDetails(_param,_callback){
        $.ajax({
            url:'http://www.nbmsa.gov.cn/api/law_documents/offline/',
            data :{
                start : parseInt(_param.start,10) || 0,
                num : parseInt(_param.num,10) || 20
            },
            success : function(_result){
                _callback && _callback(_result);
                //
                for(var i= 0, l = _result.length; i<l; i++){
                    try{
                        var item =_result[i];
                        detailStore.save({
                            key : ''+item.id,
                            data : item
                        });
                    }catch(e){
                        alert('数据离线失败');
                    }
                }
            }
        });
    };
    //
    var sql = {
        getDetailById : function(_id){
            var deferred = $.Deferred();

            detailStore.get(''+_id,function(_res){
                if(_res && _res.data){// cache hits
                    deferred.resolve(_res.data);
                }else{
                    getHTMLById(_id, function(_result){
                        deferred.resolve(_result.data);
                    });
                }
            });

            return deferred;
        },
        listCategory : function(){
            var deferred = $.Deferred();

            store.get('categories',function(_res){
                if(!navigator.onLine  && _res && _res.data){// cache hits
                    deferred.resolve(_res.data);
                }else{
                    fetchCategorys(function(_result){
                        deferred.resolve(_result.data);
                    });
                }
            })

            return deferred;
        },
        listDocuments : function(_param){
            if(_param.cat == null){
                throw Error('No category parameter')
            }

            var deferred = $.Deferred();
            var start = _param.start || 0,
                num = _param.num || PAGESIZE
            store.get('documents'+_param.cat,function(older){
                if(older && older.data){
                    var outs = older.data.slice(start,start+num);
                    if(outs[0] && outs[num-1]){//cache hits
                        deferred.resolve(outs);
                        return;
                    }
                }
                // not hit
                fetchDocuments(_param,function(_res2){
                    deferred.resolve(_res2.data);
                });
            });

            return deferred;
        },
        search : function(_param){
            var deferred = $.Deferred();
            if(navigator.onLine ){
	            searchDocuments(_param,function(_res){
	                if(_res){
	                    deferred.resolve(_res);
	                }else{
	                    deferred.resolve([]);
	                }
	            })
        	}else{
                offlineSearch(_param,function(_res){
                    if(_res){
                        deferred.resolve(_res);
                    }else{
                        deferred.resolve([]);
                    }
                })
        	}
            return deferred;
        },
        download: function(_param, _callback){
            var param = _param || {};
            // var deferred = $.Deferred();
            var start = param.start || 0,
                num = param.num || PAGESIZE

            // 强制下载
            preFetch(function(_res){
                // deferred.done(_res);
                if (_callback) {
                    _callback(_res);
                };
            })

            // return deferred;

        }
    };
    // 异步请求的排队功能
    var reqs = [];
    function queue(_func, _this, _argArray){
        reqs.push({
            func : _func,
            self : _this,
            args : _argArray
        });
    }
    function next(){
        var req = reqs.pop();
        if(req && typeof req.func == 'function'){
            req.func.apply(req.self,req.args);
        }
    }

    var documentTotal = 0;
    function preFetch(_callback){
        // download category
        var categoryMaps = {};
        sql.listCategory().done(function(_lst){
            for (var i = _lst.length - 1; i >= 0; i--) {
                var item = _lst[i];
                if(item.children.length >0 ){//level 2
                	$.each(function(_index, _item){
                		documentTotal += _item.docs_amount;
	                	categoryMaps[_item.id] = _item.docs_amount;
                	})
                }else{
	                documentTotal += item.docs_amount;
	                categoryMaps[item.id] = item.docs_amount;
                }
            }
        }).then(preFetchDocuments).done(preFetchDetails);

        function preFetchDocuments(){
            var deferred = $.Deferred();
            // download all documents
            // 列表下载比例占总下载量的20%
            var downloadNum = 0;
            for(var i in categoryMaps){
                if(categoryMaps.hasOwnProperty(i)){
                    if(categoryMaps[i] != 0){
                        // add queue;
                        queue(function(j,categoryMaps,downloadNum,documentTotal,_callback,deferred){
                            sql.listDocuments({
                                cat : j,
                                start :0,
                                num : categoryMaps[j]
                            }).done(function(){
                                downloadNum += categoryMaps[j];
                                var percent = parseInt(downloadNum * 100 * 0.2 / documentTotal,10);
                                if (_callback) {
                                    _callback(percent);
                                };

                                if (downloadNum >= documentTotal) {
                                    deferred.resolve();
                                };
                                // call next
                                next()
                            })
                        },null,[i,categoryMaps,downloadNum,documentTotal,_callback,deferred]);
                    }
                }
            }
            return deferred;
        }

        function preFetchDetails(){
            var deferred = $.Deferred();
            // meanwhile download document's detail
            var downloadNum = 0;
            var start = 0;
            for (var start = 0; start < documentTotal; start += PAGESIZE) {
                // add queue;
                queue(function(start,downloadNum,documentTotal,_callback,deferred){
                    fetchDetails({
                        start : start,
                        num : PAGESIZE,
                    }, function(){
                        downloadNum += PAGESIZE;
                        var percent = parseInt(downloadNum * 100 * 0.2 / documentTotal,10) + 20;
                        if (_callback) {
                            _callback(percent);
                        };

                        if (downloadNum >= documentTotal) {
                            deferred.resolve();
                        };
                    });
                },null,[start,downloadNum,documentTotal,_callback,deferred]);
            };
            return deferred;
        }
    };
    //
    exports.sql = sql;

})(window,Zepto);