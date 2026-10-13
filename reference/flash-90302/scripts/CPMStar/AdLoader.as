package CPMStar
{
   import flash.display.DisplayObject;
   import flash.display.Loader;
   import flash.net.URLRequest;
   import flash.system.Security;
   
   public class AdLoader
   {
      
      private static var cpmstarLoader:Loader;
      
      public function AdLoader()
      {
         super();
      }
      
      public static function LoadAd(param1:int, param2:int) : DisplayObject
      {
         Security.allowDomain("server.cpmstar.com");
         var _loc3_:String = "http://server.cpmstar.com/adviewas3.swf";
         cpmstarLoader = new Loader();
         cpmstarLoader.load(new URLRequest(_loc3_ + "?poolid=" + param1 + "&subpoolid=" + param2));
         return cpmstarLoader;
      }
   }
}

