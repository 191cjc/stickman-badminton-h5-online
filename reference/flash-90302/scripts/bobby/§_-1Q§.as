package bobby
{
   import flash.display.MovieClip;
   import flash.display.Stage;
   import flash.events.Event;
   import flash.events.KeyboardEvent;
   import flash.ui.Keyboard;
   
   public class §_-1Q§
   {
      
      private static var §_-3f§:Stage;
      
      private static var §_-s§:MovieClip;
      
      public static var keyPressedSpace:Boolean = false;
      
      public static var keyPressedUp:Boolean = false;
      
      public static var keyPressedDown:Boolean = false;
      
      public static var keyPressedLeft:Boolean = false;
      
      public static var keyPressedRight:Boolean = false;
      
      public static var §_-a§:Boolean = false;
      
      public static var §_-5a§:Boolean = false;
      
      public static var § var§:Boolean = false;
      
      public static var §_-38§:Boolean = false;
      
      private static var §_-0P§:Boolean = false;
      
      public function §_-1Q§()
      {
         super();
      }
      
      public static function init(param1:MovieClip) : void
      {
         if(!§_-0P§)
         {
            §_-s§ = param1;
            §_-3f§ = param1.stage;
            §_-3f§.addEventListener(KeyboardEvent.KEY_DOWN,§_-0U§);
            §_-3f§.addEventListener(KeyboardEvent.KEY_UP,native);
            §_-0P§ = true;
         }
      }
      
      private static function native(param1:KeyboardEvent) : void
      {
         if(param1.keyCode == Keyboard.SPACE)
         {
            keyPressedSpace = false;
         }
         if(param1.keyCode == Keyboard.UP)
         {
            keyPressedUp = false;
         }
         if(param1.keyCode == Keyboard.LEFT)
         {
            keyPressedLeft = false;
         }
         if(param1.keyCode == Keyboard.DOWN)
         {
            keyPressedDown = false;
         }
         if(param1.keyCode == Keyboard.RIGHT)
         {
            keyPressedRight = false;
         }
         if(param1.keyCode == 87)
         {
            §_-a§ = false;
         }
         if(param1.keyCode == 65)
         {
            §_-5a§ = false;
         }
         if(param1.keyCode == 83)
         {
            § var§ = false;
         }
         if(param1.keyCode == 68)
         {
            §_-38§ = false;
         }
      }
      
      private static function §_-0U§(param1:KeyboardEvent) : void
      {
         var _loc2_:String = null;
         §_-3f§.dispatchEvent(new Event("keyPressedAny"));
         if(param1.keyCode >= 48 && param1.keyCode <= 90)
         {
            _loc2_ = String.fromCharCode(param1.charCode);
            _loc2_ = _loc2_.toUpperCase();
            _loc2_ = "keyPressed" + _loc2_;
            §_-3f§.dispatchEvent(new Event(_loc2_));
         }
         if(param1.keyCode >= 37 && param1.keyCode <= 40)
         {
            if(param1.keyCode == Keyboard.UP)
            {
               §_-3f§.dispatchEvent(new Event("keyPressedUp"));
            }
            else if(param1.keyCode == Keyboard.LEFT)
            {
               §_-3f§.dispatchEvent(new Event("keyPressedLeft"));
            }
            else if(param1.keyCode == Keyboard.DOWN)
            {
               §_-3f§.dispatchEvent(new Event("keyPressedDown"));
            }
            else if(param1.keyCode == Keyboard.RIGHT)
            {
               §_-3f§.dispatchEvent(new Event("keyPressedRight"));
            }
         }
         if(param1.keyCode == Keyboard.SPACE)
         {
            §_-3f§.dispatchEvent(new Event("keyPressedSpace"));
         }
         if(param1.keyCode == Keyboard.ESCAPE)
         {
            trace("keyPressedEsc");
            §_-3f§.dispatchEvent(new Event("keyPressedEsc"));
         }
         if(param1.keyCode >= 37 && param1.keyCode <= 40 || (param1.keyCode == 87 || param1.keyCode == 65 || param1.keyCode == 83 || param1.keyCode == 68))
         {
            §_-3f§.dispatchEvent(new Event("keyPressedWASD"));
         }
         if(param1.keyCode == Keyboard.SPACE)
         {
            keyPressedSpace = true;
         }
         if(param1.keyCode == Keyboard.UP)
         {
            keyPressedUp = true;
         }
         if(param1.keyCode == Keyboard.LEFT)
         {
            keyPressedLeft = true;
         }
         if(param1.keyCode == Keyboard.DOWN)
         {
            keyPressedDown = true;
         }
         if(param1.keyCode == Keyboard.RIGHT)
         {
            keyPressedRight = true;
         }
         if(param1.keyCode == 87)
         {
            §_-a§ = true;
         }
         if(param1.keyCode == 65)
         {
            §_-5a§ = true;
         }
         if(param1.keyCode == 83)
         {
            § var§ = true;
         }
         if(param1.keyCode == 68)
         {
            §_-38§ = true;
         }
      }
   }
}

