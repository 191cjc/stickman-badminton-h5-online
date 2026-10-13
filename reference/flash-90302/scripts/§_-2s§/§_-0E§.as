package §_-2s§
{
   import Playtomic.Log;
   import §_-0V§.*;
   import §_-2g§.§_-1d§;
   import bobby.§_-07§;
   import bobby.§_-0v§;
   import flash.display.MovieClip;
   import flash.display.SimpleButton;
   import flash.events.Event;
   import flash.events.MouseEvent;
   import flash.net.SharedObject;
   import flash.text.TextField;
   
   [Embed(source="/_assets/assets.swf", symbol="symbol454")]
   public class §_-0E§ extends §_-07§
   {
      
      public var §_-1x§:SimpleButton;
      
      public var §_-5p§:TextField;
      
      public var theSpotlight:MovieClip;
      
      public var §_-z§:SimpleButton;
      
      public var §_-5K§:SimpleButton;
      
      public var §_-05§:SimpleButton;
      
      public var §_-57§:MovieClip;
      
      public var §_-4X§:MovieClip;
      
      public var §_-4G§:MovieClip;
      
      public var §_-2c§:SimpleButton;
      
      public var dynamic:MovieClip;
      
      public var §_-0R§:MovieClip;
      
      public var §_-5N§:SimpleButton;
      
      public var §_-N§:SimpleButton;
      
      public var §_-46§:TextField;
      
      public var §_-4L§:SimpleButton;
      
      public var §_-2L§:TextField;
      
      public var §_-1a§:MovieClip;
      
      public var §_-1c§:SimpleButton;
      
      public var §_-0x§:MovieClip;
      
      private var §_-2B§:§_-1d§;
      
      private var §_-4J§:Class;
      
      private var unlockLevel:Number = 0;
      
      public function §_-0E§()
      {
         super();
      }
      
      override public function handleStageAdd(param1:Event) : void
      {
         var _loc2_:SharedObject = SharedObject.getLocal("game");
         this.unlockLevel = _loc2_.data.unlockLevel;
         _loc2_.close();
         SimpleButton(this.§_-05§).visible = false;
         SimpleButton(this.§_-1x§).visible = false;
         SimpleButton(this.§_-4L§).visible = false;
         SimpleButton(this.§_-1c§).visible = false;
         SimpleButton(this.§_-5N§).visible = false;
         SimpleButton(this.§_-z§).visible = false;
         SimpleButton(this.§_-5N§).visible = true;
         SimpleButton(this.§_-z§).visible = true;
         MovieClip(this.§_-4X§).visible = false;
         MovieClip(this.§_-0R§).visible = false;
         if(this.unlockLevel >= 1)
         {
            SimpleButton(this.§_-4L§).visible = true;
            MovieClip(this.dynamic).visible = false;
         }
         if(this.unlockLevel >= 2)
         {
            SimpleButton(this.§_-1x§).visible = true;
            MovieClip(this.§_-4G§).visible = false;
         }
         if(this.unlockLevel >= 3)
         {
            SimpleButton(this.§_-1c§).visible = true;
            MovieClip(this.§_-0x§).visible = false;
         }
         if(this.unlockLevel >= 4)
         {
            SimpleButton(this.§_-05§).visible = true;
            MovieClip(this.§_-1a§).visible = false;
         }
         super.handleStageAdd(param1);
         SimpleButton(this.§_-5K§).addEventListener(MouseEvent.MOUSE_UP,this.§_-0H§);
         SimpleButton(this.§_-z§).addEventListener(MouseEvent.MOUSE_UP,this.§_-04§);
         SimpleButton(this.§_-5N§).addEventListener(MouseEvent.MOUSE_UP,this.§_-Z§);
         SimpleButton(this.§_-1c§).addEventListener(MouseEvent.MOUSE_UP,this.§_-5T§);
         SimpleButton(this.§_-4L§).addEventListener(MouseEvent.MOUSE_UP,this.§_-4x§);
         SimpleButton(this.§_-1x§).addEventListener(MouseEvent.MOUSE_UP,this.§_-2V§);
         SimpleButton(this.§_-05§).addEventListener(MouseEvent.MOUSE_UP,this.§ each§);
         SimpleButton(this.§_-2c§).addEventListener(MouseEvent.MOUSE_UP,this.§_-1L§);
         SimpleButton(this.§_-N§).addEventListener(MouseEvent.MOUSE_UP,this.§ in§);
         this.§_-0H§(new MouseEvent(""));
      }
      
      private function § in§(param1:MouseEvent) : void
      {
         if(this.§_-4J§ != null)
         {
            §_-u§.§_-1i§ = this.§_-4J§;
            if(this.§_-4J§ == §_-5G§)
            {
               §_-0v§.§_-5q§(new §_-R§("robot"));
            }
            else if(this.§_-4J§ == override)
            {
               §_-0v§.§_-5q§(new §_-R§("toaster"));
            }
            else if(this.§_-4J§ == §_-5P§)
            {
               §_-0v§.§_-5q§(new §_-R§("demon"));
            }
            else
            {
               §_-0v§.§_-5q§(new §_-R§("human"));
            }
            if(this.§_-4J§ == §_-18§)
            {
               Log.CustomMetric("PlayedAsJoe","Players",false);
            }
            else if(this.§_-4J§ == §_-51§)
            {
               Log.CustomMetric("PlayedAsNadia","Players",false);
            }
            else if(this.§_-4J§ == §_-0S§)
            {
               Log.CustomMetric("PlayedAsHarry","Players",false);
            }
            else if(this.§_-4J§ == §_-5G§)
            {
               Log.CustomMetric("PlayedAsRobot","Players",false);
            }
            else if(this.§_-4J§ == override)
            {
               Log.CustomMetric("PlayedAsToaster","Players",false);
            }
            else if(this.§_-4J§ == §_-2n§)
            {
               Log.CustomMetric("PlayedAsPirate","Players",false);
            }
            else if(this.§_-4J§ == §use §)
            {
               Log.CustomMetric("PlayedAsTopHat","Players",false);
            }
            else if(this.§_-4J§ == §_-5P§)
            {
               Log.CustomMetric("PlayedAsDevil","Players",false);
            }
            else
            {
               Log.CustomMetric("PlayedAsSomething","Players",false);
            }
         }
      }
      
      private function §_-2§(param1:String = "", param2:String = "", param3:String = "") : void
      {
         TextField(this.§_-46§).text = param1;
         TextField(this.§_-2L§).text = param2;
         TextField(this.§_-5p§).text = param3;
      }
      
      private function §if§(param1:Class) : void
      {
         if(this.§_-2B§ != null)
         {
            §_-1d§(this.§_-2B§).§ case§();
         }
         var _loc2_:§_-1d§ = new §_-1d§();
         _loc2_.targetX = MovieClip(this.§_-57§).x;
         _loc2_.speed = 800;
         _loc2_.x = -50;
         _loc2_.y = MovieClip(this.§_-57§).y;
         addChild(_loc2_);
         this.§_-2B§ = _loc2_;
         if(param1 == §_-2Q§)
         {
            _loc2_.gotoAndStop(1);
         }
         else if(param1 == §_-18§)
         {
            _loc2_.gotoAndStop(2);
         }
         else if(param1 == §_-51§)
         {
            _loc2_.gotoAndStop(3);
         }
         else if(param1 == override)
         {
            _loc2_.gotoAndStop(4);
         }
         else if(param1 == §_-2n§)
         {
            _loc2_.gotoAndStop(5);
         }
         else if(param1 == §use §)
         {
            _loc2_.gotoAndStop(6);
         }
         else if(param1 == §_-5P§)
         {
            _loc2_.gotoAndStop(7);
         }
         else if(param1 == §_-5G§)
         {
            _loc2_.gotoAndStop(8);
         }
         else if(param1 == §_-0S§)
         {
            _loc2_.gotoAndStop(9);
         }
      }
      
      private function §_-4f§(param1:MouseEvent) : void
      {
         var _loc2_:String = "Little Timmy";
         var _loc3_:String = "His life\'s dream is to become a badminton star.";
         var _loc4_:String = "Pros: Springy.";
         this.§_-2§(_loc2_,_loc3_,_loc4_);
         if(this.§_-4J§ != §_-2Q§)
         {
            this.§_-4J§ = §_-2Q§;
            this.§if§(this.§_-4J§);
         }
      }
      
      private function §_-0H§(param1:MouseEvent) : void
      {
         var _loc2_:String = "Average Joe";
         var _loc3_:String = "Wants to prove to the world he\'s not just average after all.";
         var _loc4_:String = "Pros: Charming personality.";
         this.§_-2§(_loc2_,_loc3_,_loc4_);
         if(this.§_-4J§ != §_-18§)
         {
            this.§_-4J§ = §_-18§;
            this.§if§(this.§_-4J§);
         }
      }
      
      private function §_-04§(param1:MouseEvent) : void
      {
         var _loc2_:String = "Naughty Nadia";
         var _loc3_:String = "She always wanted to go out with a badminton player.";
         var _loc4_:String = "Pros: Agile but weak.";
         this.§_-2§(_loc2_,_loc3_,_loc4_);
         if(this.§_-4J§ != §_-51§)
         {
            this.§_-4J§ = §_-51§;
            this.§if§(this.§_-4J§);
         }
      }
      
      private function §_-5T§(param1:MouseEvent) : void
      {
         var _loc2_:String = "Flying Toaster";
         var _loc3_:String = "Wants the prize money to buy freedom from his cruel owners.";
         var _loc4_:String = "Pros: Floaty.";
         this.§_-2§(_loc2_,_loc3_,_loc4_);
         if(this.§_-4J§ != override)
         {
            this.§_-4J§ = override;
            this.§if§(this.§_-4J§);
         }
      }
      
      private function §_-Z§(param1:MouseEvent) : void
      {
         var _loc2_:String = "Hairy Harry";
         var _loc3_:String = "Professional badminton player here for fame and glory.";
         var _loc4_:String = "Pros: Everything but jumping.";
         this.§_-2§(_loc2_,_loc3_,_loc4_);
         if(this.§_-4J§ != §_-0S§)
         {
            this.§_-4J§ = §_-0S§;
            this.§if§(this.§_-4J§);
         }
      }
      
      private function §_-4x§(param1:MouseEvent) : void
      {
         var _loc2_:String = "Pirate Pete";
         var _loc3_:String = "Ran out of rum and needs the prize money to buy more.";
         var _loc4_:String = "Pros: Slow but strong.";
         this.§_-2§(_loc2_,_loc3_,_loc4_);
         if(this.§_-4J§ != §_-2n§)
         {
            this.§_-4J§ = §_-2n§;
            this.§if§(this.§_-4J§);
         }
      }
      
      private function §_-2V§(param1:MouseEvent) : void
      {
         var _loc2_:String = "Top Hat Sam";
         var _loc3_:String = "Wants bragging points with his yacht club buddies.";
         var _loc4_:String = "Pros: Jumpy but slow.";
         this.§_-2§(_loc2_,_loc3_,_loc4_);
         if(this.§_-4J§ != §use §)
         {
            this.§_-4J§ = §use §;
            this.§if§(this.§_-4J§);
         }
      }
      
      private function § each§(param1:MouseEvent) : void
      {
         var _loc2_:String = "The Red Dude";
         var _loc3_:String = "No one else in hell wants to play badminton against him.";
         var _loc4_:String = "Pros: Fast.";
         this.§_-2§(_loc2_,_loc3_,_loc4_);
         if(this.§_-4J§ != §_-5P§)
         {
            this.§_-4J§ = §_-5P§;
            this.§if§(this.§_-4J§);
         }
      }
      
      private function §_-1L§(param1:MouseEvent) : void
      {
         var _loc2_:String = "Robotron 3000";
         var _loc3_:String = "Experimental flying robot being tested by the military.";
         var _loc4_:String = "Pros: Mouse controls.";
         this.§_-2§(_loc2_,_loc3_,_loc4_);
         if(this.§_-4J§ != §_-5G§)
         {
            this.§_-4J§ = §_-5G§;
            this.§if§(this.§_-4J§);
         }
      }
      
      override public function handleEnterFrame(param1:Number) : void
      {
         super.handleEnterFrame(param1);
      }
      
      override public function handleRemove(param1:Event) : void
      {
         super.handleRemove(param1);
         SimpleButton(this.§_-5K§).removeEventListener(MouseEvent.MOUSE_UP,this.§_-0H§);
         SimpleButton(this.§_-z§).removeEventListener(MouseEvent.MOUSE_UP,this.§_-04§);
         SimpleButton(this.§_-5N§).removeEventListener(MouseEvent.MOUSE_UP,this.§_-Z§);
         SimpleButton(this.§_-1c§).removeEventListener(MouseEvent.MOUSE_UP,this.§_-5T§);
         SimpleButton(this.§_-4L§).removeEventListener(MouseEvent.MOUSE_UP,this.§_-4x§);
         SimpleButton(this.§_-1x§).removeEventListener(MouseEvent.MOUSE_UP,this.§_-2V§);
         SimpleButton(this.§_-05§).removeEventListener(MouseEvent.MOUSE_UP,this.§ each§);
         SimpleButton(this.§_-2c§).removeEventListener(MouseEvent.MOUSE_UP,this.§_-1L§);
         SimpleButton(this.§_-N§).removeEventListener(MouseEvent.MOUSE_UP,this.§ in§);
      }
   }
}

