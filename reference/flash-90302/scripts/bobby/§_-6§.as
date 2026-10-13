package bobby
{
   import flash.display.Loader;
   import flash.display.MovieClip;
   import flash.display.Stage;
   import flash.events.Event;
   import flash.net.URLRequest;
   import flash.system.Security;
   
   public class §_-6§
   {
      
      private static var kongregate:*;
      
      private static var §_-3f§:Stage;
      
      private static var §_-s§:MovieClip;
      
      private static var §_-1M§:Boolean = false;
      
      private static var §_-0P§:Boolean = false;
      
      public function §_-6§()
      {
         super();
      }
      
      public static function init(param1:MovieClip) : void
      {
         if(!§_-0P§)
         {
            §_-s§ = param1;
            §_-3f§ = param1.stage;
            §_-0P§ = true;
            §_-1A§();
         }
      }
      
      public static function §_-1U§(param1:String, param2:Number) : void
      {
         if(§_-1M§)
         {
            kongregate.stats.submit(param1,param2);
         }
      }
      
      private static function §_-1A§() : void
      {
         var _loc1_:Object = §_-3f§.loaderInfo.parameters;
         var _loc2_:String = _loc1_.kongregate_api_path || "http://www.kongregate.com/flash/API_AS3_Local.swf";
         Security.allowDomain(_loc2_);
         var _loc3_:URLRequest = new URLRequest(_loc2_);
         var _loc4_:Loader = new Loader();
         _loc4_.contentLoaderInfo.addEventListener(Event.COMPLETE,§_-3N§);
         _loc4_.load(_loc3_);
         §_-3f§.addChild(_loc4_);
      }
      
      private static function §_-3N§(param1:Event) : void
      {
         kongregate = param1.target.content;
         §_-1M§ = true;
         kongregate.services.connect();
      }
   }
}

