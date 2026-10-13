package bobby
{
   import flash.display.MovieClip;
   import flash.display.Sprite;
   import flash.display.Stage;
   import flash.text.TextField;
   
   public class §_-4n§
   {
      
      public static var §_-2k§:String;
      
      private static var §_-3f§:Stage;
      
      private static var §_-s§:MovieClip;
      
      public static var §_-33§:Boolean = false;
      
      public static var §_-5L§:Boolean = false;
      
      private static var §_-4F§:Array = ["dl.dropbox.com","www.flashgamelicense.com","www.effinggames.com","","kongregate.com","4399.com","sda.4399.com"];
      
      private static var §_-3B§:Array = ["kongregate.com","4399.com","sda.4399.com"];
      
      private static var §_-2X§:Array = ["kongregate.com","4399.com","sda.4399.com"];
      
      private static var §_-0P§:Boolean = false;
      
      public function §_-4n§()
      {
         super();
      }
      
      public static function init(param1:MovieClip, param2:Boolean) : void
      {
         if(!§_-0P§)
         {
            §_-s§ = param1;
            §_-3f§ = param1.stage;
            §_-0P§ = true;
            §_-5l§();
            §_-U§();
            if(param2)
            {
               §_-0p§();
            }
         }
      }
      
      private static function §_-5l§() : void
      {
         var _loc1_:Array = §_-3f§.loaderInfo.url.split("://");
         var _loc2_:Array = _loc1_[1].split("/");
         §_-2k§ = _loc2_[0];
         trace("The domain is:" + §_-2k§);
      }
      
      private static function §_-U§() : void
      {
         var _loc1_:int = 0;
         trace(§_-3B§);
         _loc1_ = 0;
         while(_loc1_ < §_-3B§.length)
         {
            if(§_-3B§[_loc1_] == §_-2k§)
            {
               §_-5L§ = true;
            }
            _loc1_++;
         }
         _loc1_ = 0;
         while(_loc1_ < §_-2X§.length)
         {
            if(§_-2X§[_loc1_] == §_-2k§)
            {
               §_-33§ = true;
            }
            _loc1_++;
         }
      }
      
      private static function §_-0p§() : void
      {
         var _loc3_:Sprite = null;
         var _loc4_:TextField = null;
         var _loc1_:Boolean = true;
         var _loc2_:int = 0;
         while(_loc2_ < §_-4F§.length)
         {
            if(§_-4F§[_loc2_] == §_-2k§)
            {
               _loc1_ = false;
            }
            _loc2_++;
         }
         if(_loc1_)
         {
            _loc3_ = new Sprite();
            §_-3f§.addChild(_loc3_);
            _loc3_.graphics.beginFill(0);
            _loc3_.graphics.drawRect(0,0,§_-3f§.stageWidth,§_-3f§.stageHeight);
            _loc3_.graphics.endFill();
            _loc3_.x = §_-3f§.stageWidth / 2 - _loc3_.width / 2;
            _loc3_.y = §_-3f§.stageHeight / 2 - _loc3_.height / 2;
            _loc4_ = new TextField();
            _loc4_.x = 10;
            _loc4_.y = 10;
            _loc4_.width = 500;
            _loc4_.selectable = false;
            _loc4_.textColor = 16777215;
            _loc4_.text = "Sitelocked - Get the distributable version at www.effinggames.com";
            §_-3f§.addChild(_loc4_);
         }
      }
   }
}

