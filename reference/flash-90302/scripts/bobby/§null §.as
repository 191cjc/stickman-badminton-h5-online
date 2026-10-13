package bobby
{
   import flash.display.MovieClip;
   import flash.display.Stage;
   import flash.events.Event;
   
   public class §null §
   {
      
      private static var §_-3f§:Stage;
      
      private static var §_-s§:MovieClip;
      
      private static function _-4r():*
      {
      }
      private static function _-p():*
      {
      }
      private static var §_-0P§:Boolean = false;
      
      public function §null §()
      {
         super();
      }
      
      public static function init(param1:MovieClip, param2:Boolean = false) : void
      {
         if(!§_-0P§)
         {
            §_-s§ = param1;
            §_-3f§ = param1.stage;
            §_-0P§ = true;
            §_-3f§.addEventListener("keyPressedF",§_-5s§);
            §_-3f§.addEventListener("keyPressedG",§_-0d§);
         }
      }
      
      private static function §_-5s§(param1:Event) : void
      {
         §_-4r§();
      }
      
      private static function §_-0d§(param1:Event) : void
      {
         §_-p§();
      }
      
      public static function §_-5W§(param1:Function) : void
      {
         §_-4r§ = param1;
      }
      
      public static function §_-4A§(param1:Function) : void
      {
         §_-p§ = param1;
      }
      
      public function §_-0v§() : *
      {
      }
   }
}

