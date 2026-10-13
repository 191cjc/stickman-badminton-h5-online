package bobby
{
   import flash.display.MovieClip;
   import flash.display.Stage;
   import flash.events.Event;
   import flash.events.MouseEvent;
   import flash.ui.Mouse;
   import flash.utils.getTimer;
   
   public class § try§
   {
      
      private static var §_-3f§:Stage;
      
      private static var §_-s§:MovieClip;
      
      public static var §null§:Boolean = false;
      
      public static var §_-36§:Boolean = false;
      
      private static const §_-2e§:Number = 200;
      
      private static var §_-0P§:Boolean = false;
      
      private static var § for§:Number = 0;
      
      public function § try§()
      {
         super();
      }
      
      public static function get x() : Number
      {
         return §_-3f§.mouseX;
      }
      
      public static function get y() : Number
      {
         return §_-3f§.mouseY;
      }
      
      public static function show() : void
      {
         Mouse.show();
         §_-36§ = false;
      }
      
      public static function hide() : void
      {
         Mouse.hide();
         §_-36§ = true;
      }
      
      public static function init(param1:MovieClip) : void
      {
         if(!§_-0P§)
         {
            §_-s§ = param1;
            §_-3f§ = param1.stage;
            §_-3f§.addEventListener(MouseEvent.MOUSE_DOWN,§_-0r§);
            §_-3f§.addEventListener(MouseEvent.MOUSE_UP,§_-E§);
            §_-0P§ = true;
         }
      }
      
      private static function §_-E§(param1:MouseEvent) : void
      {
         §null§ = false;
      }
      
      private static function §_-0r§(param1:MouseEvent) : void
      {
         §null§ = true;
         if(§ for§ + §_-2e§ > getTimer())
         {
            §_-3f§.dispatchEvent(new Event("mouseDoubleClick"));
         }
         § for§ = getTimer();
      }
   }
}

