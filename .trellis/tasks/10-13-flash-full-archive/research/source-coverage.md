# Initial evidence

Root frameCount104, frameRate60, viewport640x426, SWF15 CWS. 2 DoABC2 tags; 112 ScriptInfo and ClassInfo; 867 MethodBody. 191 DefineSprite; 169 shapes; 2 morphs; 16 bitmap; 7 fonts; 93 static+12 edit text; 12 sounds; 31 buttons; 1 unknown tag255 payload02. 1467 ShowFrame across root and sprites. No ImportAssets/DefineBinaryData/video definitions discovered in full XML.

Effect scripts include fx.BigSpark symbol278 and fx.ParticleBirdie symbol245. All8 slider AS files exist. Runtime production SVG extraction is deliberately selected, so tools/flash-assets/build.py must not be used for this full archive.

External Loaders: bobby/§_-6§.as defaults to http://www.kongregate.com/flash/API_AS3_Local.swf (overridable kongregate_api_path); CPMStar.AdLoader.LoadAd builds http://server.cpmstar.com/adviewas3.swf?poolid=...&subpoolid=...; Playtomic.PlayerLevel loads remote user-level thumbnail when used. Playtomic HTTP stats/leaderboard/crossdomain are online service endpoints, not missing embedded game art. Inspect callsites and all ABC constants before reporting the external dependency boundary.
