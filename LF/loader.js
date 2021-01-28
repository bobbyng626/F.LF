/*\
 * loader.js
 * 
 * loader is a requirejs plugin that loads content packages
\*/

define(['LF/loader-config','LF/util','core/util'],function(loader_config,util,Futil){

	return {
		load: function (name, require, load, config)
		{
			var path='';
			var content={};
			var manifest={};

			if (config.isBuild)
			{
				load();
				return ;
			}
			load_package(name);

			function load_package(pack)
			{
				path=util.normalize_path(pack);
				require( [filepath('manifest')], function(mani)
				{
					manifest=mani;
					var manifest_schema=
					{
						"data":"string",
						"resourcemap":"string!optional"
					}
					if (!validate(manifest_schema,manifest))
					{
						console.log('loader: error: manifest.js of '+path+' is not correct.');
					}
					require( [filepath(manifest.data)], load_data);
					load_something('resourcemap');
				});
			}
			function filepath(ppp)
			{
				if (!ppp)
					return '';
				if (ppp.lastIndexOf('.js')===ppp.length-3)
					ppp = ppp.slice(0,ppp.length-3);
				var suf = path.indexOf('http')===0?'.js':'';
				return path+ppp+suf;
			}
			function load_data(datalist)
			{
				function allow_load(folder,obj)
				{
					if (typeof loader_config.lazyload==='function')
					{
						if (!loader_config.lazyload(folder,obj))
							return true;
					}
					else
						return true;
				}

				var datafile_depend=[];

				for (var i in datalist)
				{
					if (datalist[i] instanceof Array)
					{
						for (var j=0; j<datalist[i].length; j++)
							if (datalist[i][j].file)
							if (allow_load(i,datalist[i][j]))
								datafile_depend.push(filepath(datalist[i][j].file));
					}
					else if (typeof datalist[i]==='object')
					{
						if (datalist[i].file)
						if (allow_load(i,datalist[i]))
							datafile_depend.push(filepath(datalist[i].file));
					}
				}

				require( datafile_depend, function()
				{
					var gamedata=Futil.extend_object({},datalist);
					var param = 0;

					for (var i in datalist)
					{
						if (datalist[i] instanceof Array)
						{
							for (var j=0; j<datalist[i].length; j++)
								if (datalist[i][j].file)
								{
									if (allow_load(i,datalist[i][j]))
									{
										gamedata[i][j].data = arguments[param];
										param++;
									}
									else
									{
										gamedata[i][j].data = 'lazy';
									}
								}
						}
						else if (typeof datalist[i]==='object')
						{
							if (datalist[i].file)
							{
								if (allow_load(i,datalist[i]))
								{
									gamedata[i].data = arguments[param];
									param++;
								}
								else
								{
									gamedata[i].data = 'lazy';
								}
							}
						}
					}

					content.data=gamedata;
					module_lazyload();
					load_ready();
				});
			}
			function load_something(thing)
			{
				require( [filepath(manifest[thing])], function(it){
					content[thing] = it;
					load_ready();
				});
			}
			function load_ready()
			{
				var content_schema=
				{
					data:'object',
					resourcemap:'object!optional'
				}
				if (validate(content_schema,content))
					load(content); //make the require loader return
			}
			function module_lazyload()
			{	//embed the lazyload module
				if (typeof loader_config.lazyload==='function')
				{
					content.data.load=function(sets,ready)
					{
						var load_list=[];
						var res_list=[];
						for (var folder in sets)
						{
							var objects=content.data[folder];
							var ID = sets[folder];
							for (var i=0; i<ID.length; i++)
							{
								var O; //search for the object
								for (var j=0; j<objects.length; j++)
									if (objects[j].id===ID[i])
									{
										O=objects[j];
										break;
									}
								if (O && O.file && O.data==='lazy')
								{
									load_list.push(O);
									res_list .push(filepath(O.file));
								}
							}
						}
						if (res_list.length===0)
							setTimeout(ready,1);
						else
							requirejs(res_list,function()
							{
								for (var i=0; i<arguments.length; i++)
									load_list[i].data = arguments[i];
								ready();
							});
					}
				}
			}

			/** a simple JSON schema validator*/
			function validate(schema,object)
			{
				var good=false;
				if (object)
				{
					good=true;
					for (var I in schema)
					{
						var sss = schema[I].split('!'),
							type = sss[0],
							option = sss[1] || '';
						if (typeof object[I]===type) {
							//good
						}
						else if (typeof object[I]==='undefined' && 
									option && option==='optional') {
							//still good
						}
						else {
							good=false;
							break;
						}
					}
				}
				return good;
			}
		},
		normalize: function (name, normalize)
		{
			return name;
		}
	}
});
