package bobby
{
   import bobby.classes.PauseScreen;
   import bobby.classes.TransitionFunction;
   import bobby.classes.TransitionState;
   import flash.display.MovieClip;
   import flash.display.Stage;
   import flash.events.ContextMenuEvent;
   import flash.events.Event;
   import flash.events.MouseEvent;
   import flash.text.TextField;
   import flash.text.TextFormat;
   import flash.ui.ContextMenu;
   import flash.ui.ContextMenuItem;
   import flash.utils.getTimer;
   
   public class §_-0v§
   {
      
      public static var §_-b§:§_-07§;
      
      private static var §_-4v§:Number;
      
      private static var §_-5E§:Number;
      
      private static var §_-4Y§:PauseScreen;
      
      private static var §_-4K§:ContextMenu;
      
      private static var §_-5k§:TextField;
      
      private static var §_-3f§:Stage;
      
      private static var §_-s§:MovieClip;
      
      private static var §_-4a§:Boolean = false;
      
      private static var §_-4g§:Boolean = false;
      
      public static var §_-2r§:String = "http://www.google.com";
      
      public static var §else§:String = "http://www.effinggames.com";
      
      private static var §_-30§:Array = [];
      
      private static var §_-4-§:Array = [];
      
      private static var §_-0P§:Boolean = false;
      
      public function §_-0v§()
      {
         super();
      }
      
      public static function init(param1:MovieClip, param2:Boolean = true, param3:Boolean = false) : void
      {
         if(!§_-0P§)
         {
            §_-s§ = param1;
            §_-3f§ = param1.stage;
            §_-0P§ = true;
            §_-4K§ = new ContextMenu();
            §_-4K§.hideBuiltInItems();
            if(param2)
            {
               §_-2l§();
            }
            §_-2j§();
            §_-3f§.addEventListener("keyPressedP",§_-5A§);
            §_-3f§.addEventListener(Event.ENTER_FRAME,§_-1R§);
            if(param3)
            {
               §_-6-§(§catch§);
            }
         }
      }
      
      private static function §catch§(param1:Number) : *
      {
         if(§_-5k§ != null)
         {
            §_-3f§.removeChild(§_-5k§);
         }
         §_-5k§ = new TextField();
         §_-5k§.x = 3;
         §_-5k§.y = §_-3f§.stageHeight - 30;
         §_-5k§.width = 500;
         §_-5k§.selectable = false;
         §_-5k§.textColor = 16777215;
         var _loc2_:TextFormat = new TextFormat();
         _loc2_.size = 30;
         §_-5k§.defaultTextFormat = _loc2_;
         §_-3f§.addChild(§_-5k§);
         §_-4-§.push(1 / param1);
         if(§_-4-§.length > 10)
         {
            §_-4-§.shift();
         }
         var _loc3_:Number = 0;
         var _loc4_:int = 0;
         while(_loc4_ < §_-4-§.length)
         {
            _loc3_ += §_-4-§[_loc4_];
            _loc4_++;
         }
         §_-5k§.text = String(Math.floor(_loc3_ / 10));
      }
      
      public static function §_-4S§(param1:§_-07§) : void
      {
         if(§_-b§ != null)
         {
            §_-b§.remove();
            § do§(§_-b§.handleEnterFrame);
         }
         §_-b§ = param1;
         §_-6-§(§_-b§.handleEnterFrame);
         trace("The current state is: " + §_-b§);
         §_-s§.addChild(§_-b§);
         §_-s§.setChildIndex(§_-b§,0);
      }
      
      private static function §_-1R§(param1:Event) : void
      {
         var _loc2_:Number = NaN;
         var _loc3_:int = 0;
         var _loc4_:Function = null;
         if(!§_-40§)
         {
            _loc2_ = §_-2j§();
            _loc3_ = 0;
            while(_loc3_ < §_-30§.length)
            {
               _loc4_ = §_-30§[_loc3_] as Function;
               _loc4_(_loc2_);
               _loc3_++;
            }
         }
      }
      
      public static function §_-6-§(param1:Function) : void
      {
         §_-30§.push(param1);
      }
      
      public static function § do§(param1:Function) : void
      {
         §_-3e§.§_-2h§(§_-30§,param1);
      }
      
      private static function §_-2j§() : Number
      {
         §_-4v§ = getTimer();
         var _loc1_:Number = §_-4v§ - §_-5E§;
         §_-5E§ = §_-4v§;
         var _loc2_:Number = _loc1_ / 1000;
         if(_loc2_ > 1000 / (§_-3f§.frameRate / 4))
         {
            _loc2_ = §_-3f§.frameRate / 4;
         }
         return _loc2_;
      }
      
      private static function §_-2l§() : void
      {
         var _loc1_:ContextMenuItem = new ContextMenuItem("© Effing Games");
         _loc1_.addEventListener(ContextMenuEvent.MENU_ITEM_SELECT,§_-3d§);
         §_-4K§.customItems.push(_loc1_);
         §_-s§.contextMenu = §_-4K§;
      }
      
      public static function §_-5h§(param1:MouseEvent) : void
      {
         §_-2W§.§_-4D§(§_-2r§);
      }
      
      public static function §_-3d§(param1:ContextMenuEvent) : void
      {
         §_-2W§.§_-4D§(§else§);
      }
      
      public static function set §_-31§(param1:Boolean) : void
      {
         §_-4g§ = param1;
         param1 = false;
         if(param1)
         {
            §_-4a§ = false;
         }
      }
      
      public static function get §_-40§() : Boolean
      {
         return §_-4a§;
      }
      
      public static function §_-5A§(... rest) : void
      {
         if(!§_-4a§ && §_-4g§)
         {
            §_-4a§ = true;
            §_-4Y§ = new PauseScreen();
            §_-4Y§.x = §_-3f§.stageWidth / 2;
            §_-4Y§.y = §_-3f§.stageHeight / 2;
            §_-s§.addChild(§_-4Y§);
         }
         else if(§_-4a§)
         {
            §_-4a§ = false;
            §_-5E§ = getTimer();
            §_-4Y§.remove();
         }
      }
      
      public static function §_-5q§(param1:§_-07§, param2:Number = 0.17, param3:Number = 0.33, param4:Number = 0) : void
      {
         var _loc5_:TransitionState = new TransitionState(param1,param2,param3,param4);
         §_-s§.addChild(_loc5_);
      }
      
      public static function §_-2y§(param1:§_-07§) : void
      {
         §_-5q§(param1,0.33333,1.33333,0.3);
      }
      
      public static function §_-03§(param1:Function, param2:Number = 0.37, param3:Number = 0.47, param4:Number = 0) : void
      {
         var _loc5_:TransitionFunction = new TransitionFunction(param1,param2,param3,param4);
         §_-s§.addChild(_loc5_);
      }
   }
}

